package com.btk.staj.VIPTransferProject.service;

import com.google.maps.DirectionsApi;
import com.google.maps.GeoApiContext;
import com.google.maps.model.DirectionsResult;
import com.google.maps.model.LatLng;
import com.btk.staj.VIPTransferProject.dto.routing.RouteInfoDto;
import com.btk.staj.VIPTransferProject.exception.BusinessRuleException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Service
public class GoogleMapsService {

    private static final String MOCK_ENCODED_POLYLINE =
            "sq|zFkrnnD~pm@{ol@";

    private final GeoApiContext geoApiContext;
    private final boolean mockEnabled;
    private final BigDecimal mockDistanceKm;

    public GoogleMapsService(
            GeoApiContext geoApiContext,
            @Value("${app.google-maps.mock-enabled:false}")
            boolean mockEnabled,
            @Value("${app.google-maps.mock-distance-km:15.00}")
            BigDecimal mockDistanceKm
    ) {
        this.geoApiContext = geoApiContext;
        this.mockEnabled = mockEnabled;
        this.mockDistanceKm = mockDistanceKm;
    }

    public RouteInfoDto getRoute(double pickupLat, double pickupLon, double dropoffLat, double dropoffLon) {
        if (mockEnabled) {
            log.info(
                    "Google Maps mock rota kullanıldı. distanceKm={}",
                    mockDistanceKm
            );
            return new RouteInfoDto(
                    MOCK_ENCODED_POLYLINE,
                    mockDistanceKm
            );
        }

        try {
            DirectionsResult result = DirectionsApi.newRequest(geoApiContext)
                    .origin(new LatLng(pickupLat, pickupLon))
                    .destination(new LatLng(dropoffLat, dropoffLon))
                    .await();

            if (result.routes == null || result.routes.length == 0) {
                throw new BusinessRuleException("Başlangıç ve varış noktaları arasında rota bulunamadı.");
            }

            String encodedPolyline = result.routes[0].overviewPolyline.getEncodedPath();
            BigDecimal distanceKm = BigDecimal.valueOf(result.routes[0].legs[0].distance.inMeters)
                    .divide(BigDecimal.valueOf(1000), 2, RoundingMode.HALF_UP);

            log.info("Rota hesaplandı. distanceKm={}", distanceKm);
            return new RouteInfoDto(encodedPolyline, distanceKm);

        } catch (BusinessRuleException e) {
            throw e;
        } catch (Exception e) {
            log.error("Google Maps Directions API hatası", e);
            throw new BusinessRuleException("Rota hesaplanamadı. Lütfen tekrar deneyin.");
        }
    }
}
