package com.btk.staj.VIPTransferProject.dto.pricing;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GeoJsonPolygonDto {

    @NotNull
    @Pattern(regexp = "Polygon", message = "type alanı 'Polygon' olmalıdır")
    private String type;

    @NotEmpty
    private List<List<List<Double>>> coordinates;
}