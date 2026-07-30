package com.btk.staj.VIPTransferProject.security.util;

import jakarta.servlet.http.HttpServletRequest;

public class IpUtil {

    private IpUtil() {
        // Utility sınıflarından nesne üretilmesini engellemek için private constructor
    }

    public static String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty()) {
            return request.getRemoteAddr();
        }
        // X-Forwarded-For birden fazla IP içerebilir (virgülle ayrılmış). İlk IP gerçek istemcidir.
        return xfHeader.split(",")[0].trim();
    }
}