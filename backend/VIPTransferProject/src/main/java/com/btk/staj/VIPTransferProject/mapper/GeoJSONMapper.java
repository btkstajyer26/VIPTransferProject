package com.btk.staj.VIPTransferProject.mapper;

import com.btk.staj.VIPTransferProject.dto.pricing.GeoJsonPolygonDto;
import org.locationtech.jts.geom.*;
import org.springframework.stereotype.Component;
import org.wololo.geojson.Polygon;
import org.wololo.jts2geojson.GeoJSONReader;
import org.wololo.jts2geojson.GeoJSONWriter;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class GeoJSONMapper {

    private final GeoJSONReader reader = new GeoJSONReader();
    private final GeoJSONWriter writer = new GeoJSONWriter();

    public org.locationtech.jts.geom.Polygon toJtsPolygon(GeoJsonPolygonDto dto) {
        Polygon geoJsonPolygon = new Polygon(toDoubleArray(dto.getCoordinates()));
        Geometry geometry = reader.read(geoJsonPolygon);
        return (org.locationtech.jts.geom.Polygon) geometry;
    }

    public GeoJsonPolygonDto toDto(org.locationtech.jts.geom.Polygon polygon) {
        Polygon geoJsonPolygon = (Polygon) writer.write(polygon);
        List<List<List<Double>>> coordinates = toDoubleList(geoJsonPolygon.getCoordinates());
        return new GeoJsonPolygonDto("Polygon", coordinates);
    }

    private double[][][] toDoubleArray(List<List<List<Double>>> coords) {
        return coords.stream()
                .map(ring -> ring.stream()
                .map(point -> new double[]{point.get(0), point.get(1)})
                .toArray(double[][]::new))
                .toArray(double[][][]::new);
    }

    private List<List<List<Double>>> toDoubleList(double[][][] coords){
        return java.util.Arrays.stream(coords)
                .map(ring -> java.util.Arrays.stream(ring)
                        .map(point -> List.of(point[0], point[1]))
                        .collect(Collectors.toList()))
                .collect(Collectors.toList());
    }

}