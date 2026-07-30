package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.pricing.PricingRuleRequestDto;
import com.btk.staj.VIPTransferProject.dto.pricing.PricingZoneRequestDto;
import com.btk.staj.VIPTransferProject.dto.pricing.PricingZoneResponseDto;
import com.btk.staj.VIPTransferProject.entity.PricingZone;
import com.btk.staj.VIPTransferProject.exception.InvalidPricingRuleException;
import com.btk.staj.VIPTransferProject.exception.ResourceNotFoundException;
import com.btk.staj.VIPTransferProject.mapper.GeoJSONMapper;
import com.btk.staj.VIPTransferProject.repository.pricing.PricingZoneRepository;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.MultiPolygon;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.WKTReader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PricingZoneService {
    private final PricingZoneRepository pricingZoneRepository;
    private final GeoJSONMapper geoJSONMapper;

    public PricingZoneResponseDto getById(Long id){
        PricingZone zone = pricingZoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PricingZone bulunamadı: id=" + id));
        return toResponse(zone);
    }

    public List<PricingZoneResponseDto> getAllActive(){
        List<PricingZone> activeZones = pricingZoneRepository.findByActiveTrue();
        return activeZones.stream()
                .map(activeZone -> toResponse(activeZone))
                .toList();
    }

    private PricingZoneResponseDto toResponse(PricingZone zone){
        return PricingZoneResponseDto.builder()
                .id(zone.getId())
                .name(zone.getName())
                .description(zone.getDescription())
                .polygon(geoJSONMapper.toDto(zone.getPolygonGeom()))
                .basePrice(zone.getBasePrice())
                .minPrice(zone.getMinPrice())
                .pricePerKm(zone.getPricePerKm())
                .currency(zone.getCurrency())
                .active(zone.isActive())
                .createdAt(zone.getCreatedAt())
                .updatedAt(zone.getUpdatedAt())
                .build();
    }

    private BigDecimal resolveMinPrice(BigDecimal minPrice){
        return minPrice != null ? minPrice : BigDecimal.ZERO;
    }

    private String resolveCurrency(String currency) {
        return currency != null ? currency : "TRY";
    }

    private void validate(PricingZoneRequestDto request){
        BigDecimal minPrice = resolveMinPrice(request.getMinPrice());
        if(minPrice.compareTo(request.getBasePrice())>0){
            throw new InvalidPricingRuleException("minPrice, basePrice'tan büyük olamaz (minPrice=" + minPrice +
                    ", basePrice=" + request.getBasePrice() + ")");
        }
    }

    private Polygon toValidPolygon(PricingZoneRequestDto request){
        Polygon polygon = geoJSONMapper.toJtsPolygon(request.getPolygon());

        if (!polygon.isValid()) {
            throw new InvalidPricingRuleException( "Gönderilen polygon geometrisi geçersiz. Halka kapanmıyor olabilir " +
                    "(ilk ve son koordinat aynı olmalı) ya da kendisiyle kesişiyor olabilir.");
        }

        return polygon;
    }

    /**
     * Yeni poligonu mevcut aktif bölgelerin dışına iter (ST_Difference).
     * Çakışan alan otomatik kesilir; kalan alan döndürülür.
     * <ul>
     *   <li>Çakışma yoksa orijinal poligon değişmeden döner.</li>
     *   <li>Sonuç MultiPolygon ise en büyük parça alınır (çizilen alan mevcut bölge tarafından ikiye bölündü).</li>
     *   <li>Sonuç tamamen boşsa (çizilen alan zaten kaplı) hata fırlatılır.</li>
     * </ul>
     */
    private Polygon clipToNonOverlapping(Polygon polygon, Long excludeId) {
        String clippedWkt = pricingZoneRepository
                .computeNonOverlappingAreaWkt(polygon.toText(), excludeId)
                .orElse(null);

        // Sorgu sonuç döndürmediyse veya boş geometriyse çakışma yoktur, orijinali kullan.
        if (clippedWkt == null || clippedWkt.isBlank()) {
            return polygon;
        }

        Geometry clipped;
        try {
            clipped = new WKTReader().read(clippedWkt);
        } catch (ParseException e) {
            // WKT parse hatası beklenmiyor; güvenli tarafta kalıp orijinali döndür.
            return polygon;
        }

        clipped.setSRID(4326);

        if (clipped.isEmpty()) {
            throw new InvalidPricingRuleException(
                    "Çizilen alan tamamen mevcut aktif fiyat bölgeleriyle kaplıdır. " +
                    "Lütfen daha önce tanımlanmamış bir alan seçiniz.");
        }

        if (clipped instanceof Polygon clippedPolygon) {
            return clippedPolygon;
        }

        if (clipped instanceof MultiPolygon mp) {
            // Mevcut bölge çizimi ikiye böldüyse en büyük parçayı kaydet.
            Polygon largest = null;
            double maxArea = -1;
            for (int i = 0; i < mp.getNumGeometries(); i++) {
                Polygon part = (Polygon) mp.getGeometryN(i);
                if (part.getArea() > maxArea) {
                    maxArea = part.getArea();
                    largest = part;
                }
            }
            return largest;
        }

        // Beklenmedik geometri türü — orijinali döndür.
        return polygon;
    }

    @Transactional
    public PricingZoneResponseDto create(PricingZoneRequestDto request){
        validate(request);
        Polygon polygon = clipToNonOverlapping(toValidPolygon(request), null);

        PricingZone zone = PricingZone.builder()
                .name(request.getName())
                .description(request.getDescription())
                .polygonGeom(polygon)
                .basePrice(request.getBasePrice())
                .minPrice(resolveMinPrice(request.getMinPrice()))
                .pricePerKm(request.getPricePerKm())
                .currency(resolveCurrency(request.getCurrency()))
                .build();

        PricingZone saved = pricingZoneRepository.save(zone);
        return toResponse(saved);
    }

    @Transactional
    public PricingZoneResponseDto update(Long id, PricingZoneRequestDto request) {
        validate(request);
        Polygon polygon = clipToNonOverlapping(toValidPolygon(request), id);

        PricingZone zone = pricingZoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PricingZone bulunamadı: id=" + id));

        zone.setName(request.getName());
        zone.setDescription(request.getDescription());
        zone.setPolygonGeom(polygon);
        zone.setBasePrice(request.getBasePrice());
        zone.setMinPrice(resolveMinPrice(request.getMinPrice()));
        zone.setPricePerKm(request.getPricePerKm());
        zone.setCurrency(resolveCurrency(request.getCurrency()));

        return toResponse(zone);
    }

    @Transactional
    public void deactivate(Long id) {
        PricingZone zone = pricingZoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PricingZone bulunamadı: id=" + id));
        zone.setActive(false);
    }
}
