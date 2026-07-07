/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, SECURITY DATA SEGURIDAD EN DATOS Y FIRMA DIGITAL S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.securitydata.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado raiz epresentado como un objeto <code>X509Certificate</code>.<br>
 * emitido por SECURITY DATA SEGURIDAD EN DATOS Y FIRMA DIGITAL S.A.
 *
 * @author Misael Fernández, SECURITY DATA SEGURIDAD EN DATOS Y FIRMA DIGITAL
 * S.A.
 */
public class CaCertSecurityData extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public CaCertSecurityData() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIENDCCAxygAwIBAgIETVxNRjANBgkqhkiG9w0BAQsFADCBlDELMAkGA1UEBhMC\n");
        stringBuilder.append("RUMxGzAZBgNVBAoTElNFQ1VSSVRZIERBVEEgUy5BLjEwMC4GA1UECxMnRU5USURB\n");
        stringBuilder.append("RCBERSBDRVJUSUZJQ0FDSU9OIERFIElORk9STUFDSU9OMTYwNAYDVQQDEy1BVVRP\n");
        stringBuilder.append("UklEQUQgREUgQ0VSVElGSUNBQ0lPTiBSQUlaIFNFQ1VSSVRZIERBVEEwHhcNMTEw\n");
        stringBuilder.append("MjE2MjE0ODUwWhcNMzEwMjE2MjIxODUwWjCBlDELMAkGA1UEBhMCRUMxGzAZBgNV\n");
        stringBuilder.append("BAoTElNFQ1VSSVRZIERBVEEgUy5BLjEwMC4GA1UECxMnRU5USURBRCBERSBDRVJU\n");
        stringBuilder.append("SUZJQ0FDSU9OIERFIElORk9STUFDSU9OMTYwNAYDVQQDEy1BVVRPUklEQUQgREUg\n");
        stringBuilder.append("Q0VSVElGSUNBQ0lPTiBSQUlaIFNFQ1VSSVRZIERBVEEwggEiMA0GCSqGSIb3DQEB\n");
        stringBuilder.append("AQUAA4IBDwAwggEKAoIBAQCxmlv/O072egF5HYTJJkGutwPkXL5bB0oA+PoaDgcm\n");
        stringBuilder.append("+zbfZ9c0dFumdzqlpfIC+wBsfp03iXYpP/WImeBj7vrNypwdjtCr1sXiydcxeZ1a\n");
        stringBuilder.append("OR3o6kKDCA1lrlFyrlGpDiNKp+uOudAN1EHhv/qlP7dGEDdqR4cIxa1sQau9TETH\n");
        stringBuilder.append("sZ8QXlw7mvy8EPoFx6iRWoYYKzbFllqPAKpXqZRLxB1LU8XQrYR/Qcna0dKipW9E\n");
        stringBuilder.append("fppzKcGAmRnnwh54wwBjs4hjJxaU+pAoZfrAwkb2YuHrsqjKKXsE2SNErIsxGHcY\n");
        stringBuilder.append("QAZK2bQ8V2VhyIxHtLPkIStub87+A3z+1YDpo6EFRsopAgMBAAGjgYswgYgwKwYD\n");
        stringBuilder.append("VR0QBCQwIoAPMjAxMTAyMTYyMTQ4NTBagQ8yMDMxMDIxNjIyMTg1MFowCwYDVR0P\n");
        stringBuilder.append("BAQDAgEGMB8GA1UdIwQYMBaAFJYDiNYbjEQhXOJgbrX3pR91oW3uMB0GA1UdDgQW\n");
        stringBuilder.append("BBSWA4jWG4xEIVziYG6196UfdaFt7jAMBgNVHRMEBTADAQH/MA0GCSqGSIb3DQEB\n");
        stringBuilder.append("CwUAA4IBAQBKia5BQFNkgji0MqpQnVOEnhJulge5/pbk0BGhGB3kuRozThu72BhV\n");
        stringBuilder.append("WmTJG2n2soUGReob/eEDbv2Dd6HAPlotjmZhLa1gTvAMlZjOFIp5ZSBp4i0CxUgn\n");
        stringBuilder.append("MYhIkny9EwIzoL3uHTPTaC7z+m0eU4lmErOFdsPxYP28az9kJTTf9C98HaWnaTU2\n");
        stringBuilder.append("UC4P16k5egDSQkh5yb0qVH7LQsHowVPJteTa+lgz8ze3UoAyxZldmVQYlRXBA2Gb\n");
        stringBuilder.append("CA2PUk/fmdNPN76fI473m7NCXIGP1718N1/+fOVPjCAUwMyArIvmwM+IeP5vLvPt\n");
        stringBuilder.append("/4BhckuhKgpJE8T88mqWfbQKuz6iU0FW\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }
}
