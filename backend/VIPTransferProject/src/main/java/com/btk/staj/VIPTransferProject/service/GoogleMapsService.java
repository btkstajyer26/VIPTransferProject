package com.btk.staj.VIPTransferProject.service;

import com.google.maps.DirectionsApi;
import com.google.maps.GeoApiContext;
import com.google.maps.model.DirectionsResult;
import com.google.maps.model.LatLng;
import com.btk.staj.VIPTransferProject.dto.routing.RouteInfoDto;
import com.btk.staj.VIPTransferProject.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleMapsService {

    private final GeoApiContext geoApiContext;

    public RouteInfoDto getRoute(double pickupLat, double pickupLon, double dropoffLat, double dropoffLon) {
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
