package com.btk.staj.VIPTransferProject.util;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.io.WKTWriter;

import java.util.ArrayList;
import java.util.List;

public final class PolylineDecoder {
    private PolylineDecoder(){}

    public static List<Coordinate> decode(String encoded){
        List<Coordinate> coordinates = new ArrayList<>();
        int index = 0, len = encoded.length();
        int lng = 0, lat = 0;

        while(index<len){
            int result = 0, shift = 0,b;
            do{
                b = encoded.charAt(index++) -63;
                result |= (b&0x1f)<<shift;
                shift += 5;
            }
            while(b>=0x20);
            int dlat =((result & 1)!=0) ? ~(result >> 1) : (result >> 1);
            lat += dlat;

            result = 0;
            shift = 0;
            do{
                b = encoded.charAt(index++) -63;
                result |= (b&0x1f)<<shift;
                shift += 5;
            }
            while (b >= 0x20);
            int dlng = ((result & 1) != 0) ? ~(result >> 1) : (result >> 1);
            lng += dlng;

            coordinates.add(new Coordinate(lng / 1e5, lat / 1e5));
        }
        return coordinates;
    }

    public static String decodeToWkt(String encoded){
        List<Coordinate> coordinates = decode(encoded);
        GeometryFactory factory = new GeometryFactory();
        LineString lineString = factory.createLineString(coordinates.toArray(new Coordinate[0]));
        return new WKTWriter().write(lineString);
    }

}
