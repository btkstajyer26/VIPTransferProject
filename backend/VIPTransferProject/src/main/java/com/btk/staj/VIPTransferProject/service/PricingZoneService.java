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
import org.locationtech.jts.geom.Polygon;
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

    @Transactional
    public PricingZoneResponseDto create(PricingZoneRequestDto request){
        validate(request);
        Polygon polygon = toValidPolygon(request);

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
        Polygon polygon = toValidPolygon(request);

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
