/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, LETMI ECUADOR S.A.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.*
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package ec.gob.firmadigital.libreria.certificate.ec.letmi.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado intermedio representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por LETMI ECUADOR S.A.
 *
 * @author Misael Fernández, LETMI ECUADOR S.A.
 */
public class SubCaCertLetmi20252035 extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public SubCaCertLetmi20252035() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIHaDCCBVCgAwIBAgIKMntQy3ubiU3SUzANBgkqhkiG9w0BAQsFADCBozEaMBgG\n");
        stringBuilder.append("A1UEAxMRTEVUTUkgUlNBIFJPT1QgQzExLTArBgNVBAsTJENBIFJTQSBST09UIChD\n");
        stringBuilder.append("ZXJ0aWZpY2F0aW9uIFNlcnZpY2VzKTEcMBoGA1UEYRMTVkFURUMtMTc5MzIyMTEw\n");
        stringBuilder.append("MTAwMTEbMBkGA1UEChMSTEVUTUkgRUNVQURPUiBTLkEuMQ4wDAYDVQQHEwVRVUlU\n");
        stringBuilder.append("TzELMAkGA1UEBhMCRUMwHhcNMjUwMTIwMTc0MDMxWhcNMzUwMTE4MTc0MDMwWjCB\n");
        stringBuilder.append("oTEZMBcGA1UEAxMQTEVUTUkgUlNBIFNVQiBDMTEsMCoGA1UECxMjQ0EgUlNBIFNV\n");
        stringBuilder.append("QiAoQ2VydGlmaWNhdGlvbiBTZXJ2aWNlcykxHDAaBgNVBGETE1ZBVEVDLTE3OTMy\n");
        stringBuilder.append("MjExMDEwMDExGzAZBgNVBAoTEkxFVE1JIEVDVUFET1IgUy5BLjEOMAwGA1UEBxMF\n");
        stringBuilder.append("UVVJVE8xCzAJBgNVBAYTAkVDMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKC\n");
        stringBuilder.append("AgEA1M3DvpwlXfazc5f0ldHj4Z23qewv591qzySCdb8hFyyFDeR91eddH9K6ha5e\n");
        stringBuilder.append("SgGtfN/7rgWEpSQuT80Wlj7WUFx16Sb5YLcA+ymyEGtFOSgJPJFs4Vt+cUe6V/+V\n");
        stringBuilder.append("qe0O+K3kVcyiHcHrWpPXmhvX9sdBs4MlHJeWE/tJkbdw2mV7giRYWm0h6sMOmfpi\n");
        stringBuilder.append("91pF99Fc3hrvRsh6maWv8FXFHxtB7KLQ6xvDPgH1PffGWq23kE4n8TBAgSWuhHpy\n");
        stringBuilder.append("bDeCj0WitdeYwak9CvehUvdWo6sewTTqsdtavz44cPGuhAt2kGc6+X3fb6C56iXj\n");
        stringBuilder.append("StXLrSyyaF/ej8CKyLy+l+NmrD45oAmuIhDu0fU2ZJGBTelu7eHk//Yes54zeiqv\n");
        stringBuilder.append("cer7EgoG2lZgct+kZ2pmy4XTuUKxF+fO33VWzy76odnIACJIA5JuK7kp06zXxMkH\n");
        stringBuilder.append("ZKe56TmLIK6bRPZnip7IRUxh5INMwq/4LnAqS4+s0FVjF372ttCN+TxZWdUlxMAF\n");
        stringBuilder.append("94AdUTX3maf+VANeAa1lm3Wxmu64cNJbHez9C359u90vPkIrmE1+qdMmN8or4L08\n");
        stringBuilder.append("Vlut7nXYcrz71fLEQ5iktMLcVtukzg6w9TzQhDF4KgTFi3nqziAwx2SnR3IwgMDP\n");
        stringBuilder.append("vly/Ovoi+dOylhvt9qkDKpOwj+bFcvJE67JPasD7p1q3XiECAwEAAaOCAZwwggGY\n");
        stringBuilder.append("MA8GA1UdEwEB/wQFMAMBAf8wHwYDVR0jBBgwFoAUeRTOpaNkXLtcicGQqdU1nPHG\n");
        stringBuilder.append("lGAwagYIKwYBBQUHAQEEXjBcMDcGCCsGAQUFBzAChitodHRwczovL2NlcnRzLmxl\n");
        stringBuilder.append("dG1pLmFwcC9MRVRNSV9DQV9ST09UMDEuY3J0MCEGCCsGAQUFBzABhhVodHRwOi8v\n");
        stringBuilder.append("b2NzcC5sZXRtaS5hcHAwGQYDVR0RBBIwEIEOaW5mb0BsZXRtaS5hcHAwcgYDVR0g\n");
        stringBuilder.append("BGswaTBnBgRVHSAAMF8wOwYIKwYBBQUHAgEWL2h0dHBzOi8vbGV0bWkuYXBwL2Rv\n");
        stringBuilder.append("Y3VtZW50b3MvTWFyY29fcmVndWxhdG9yaW8vMCAGCCsGAQUFBwICMBQMEmh0dHBz\n");
        stringBuilder.append("Oi8vbGV0bWkuYXBwLzA6BgNVHR8EMzAxMC+gLaArhilodHRwczovL2NybC5sZXRt\n");
        stringBuilder.append("aS5hcHAvTEVUTUlfQ0FfUk9PVDAxLmNybDAdBgNVHQ4EFgQUkM2RIYc6MUzlEcKs\n");
        stringBuilder.append("2KDTsifbKGMwDgYDVR0PAQH/BAQDAgEGMA0GCSqGSIb3DQEBCwUAA4ICAQBs8vWK\n");
        stringBuilder.append("oouKW73vY7QmVJ7sc1xegNG2NU+NRcpcsj1/VoB8DjrnjIe+ZsE4Uy3KyUL8fhmc\n");
        stringBuilder.append("KXNwT2P0Awn4HwbOWIRjyy5yeLeoeyVaMUAOl3zEnAf01eVF2fVBYh2lNE6XwIFX\n");
        stringBuilder.append("hvd8OW7iPB6PTOKsXALtPxcHUqoZnGSm7rQ+itrERQcHevT6Rct+9fh1X6sxa1ht\n");
        stringBuilder.append("DO+TuvAltAJ/0atVgBMTLoLuL1ztWu5wYrViUykEaiFoT5xdwep8jVflruYU1UWD\n");
        stringBuilder.append("VgW0MS/AC8trl4SNKwOXl1fPQBF1/W+B70O9izOKCzv8p6M+TXWXayKdtfzesMxY\n");
        stringBuilder.append("4dUoqOo6btf66QoPTkb0gE94I0HQN8gPjuXlWDCVu4/QyEG3Q8fVo+b/D6ZQI5gK\n");
        stringBuilder.append("Lxmn2bjlfiqhzpTIuCENorQfBQqhH8zBa8x0iLd0Lxl+XW8UDOVpbrsWR6GPPASd\n");
        stringBuilder.append("y+BcBkOFG33LABupN5Yr2u9qqJl+lL8BwujcViHLJWHZvuDzYACBKXlA+X8tSqb1\n");
        stringBuilder.append("cGtD8EhxW1ZhSzgip4KbvOyq0hjb28epBxylHrGapVLGp3IUY1rPDQkLziLD5MLV\n");
        stringBuilder.append("xd8qay+NeC2kT/yk8CNlVvXLvZgjsUz0xyWBKdeqFWCKG1tVgzd7g7cwKn+sLIfa\n");
        stringBuilder.append("8S4VvwXVdIv210Ff8ALmr94816OvlKojaTtF3A==\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }
}
