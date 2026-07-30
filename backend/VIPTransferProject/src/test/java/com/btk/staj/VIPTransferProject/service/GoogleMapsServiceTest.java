package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.routing.RouteInfoDto;
import com.btk.staj.VIPTransferProject.util.PolylineDecoder;
import com.google.maps.GeoApiContext;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class GoogleMapsServiceTest {

    @Test
    void getRoute_whenMockEnabled_returnsFixedRouteWithoutCallingGoogle() {
        GeoApiContext geoApiContext = mock(GeoApiContext.class);
        GoogleMapsService service = new GoogleMapsService(
                geoApiContext,
                true,
                new BigDecimal("15.00")
        );

        RouteInfoDto route = service.getRoute(
                41.2753,
                28.7519,
                41.0369,
                28.9850
        );

        assertThat(route.getDistanceKm())
                .isEqualByComparingTo("15.00");
        assertThat(route.getEncodedPolyline())
                .isEqualTo("sq|zFkrnnD~pm@{ol@");
        assertThat(PolylineDecoder.decodeToWkt(route.getEncodedPolyline()))
                .startsWith("LINESTRING");
        verifyNoInteractions(geoApiContext);
    }
}
