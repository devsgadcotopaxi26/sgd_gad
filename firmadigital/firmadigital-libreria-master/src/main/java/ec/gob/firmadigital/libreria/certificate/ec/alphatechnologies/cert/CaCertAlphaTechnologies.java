/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, ALPHA TECHNOLOGIES CIA. LTDA.
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
package ec.gob.firmadigital.libreria.certificate.ec.alphatechnologies.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado raiz representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por ALPHA TECHNOLOGIES CIA. LTDA.
 *
 * @author Misael Fernández, ALPHA TECHNOLOGIES CIA. LTDA.
 */
public class CaCertAlphaTechnologies extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public CaCertAlphaTechnologies() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIID1DCCArygAwIBAgIQflktBZ7VkCzqNyt6dm/4bDANBgkqhkiG9w0BAQsFADCB\n");
        stringBuilder.append("gzELMAkGA1UEBhMCRUMxEjAQBgNVBAgTCVBpY2hpbmNoYTEOMAwGA1UEBxMFUXVp\n");
        stringBuilder.append("dG8xJjAkBgNVBAoTHUFscGhhIFRlY2hub2xvZ2llcyBDaWEuIEx0ZGEuMSgwJgYD\n");
        stringBuilder.append("VQQDEx9BbHBoYSBUZWNobm9sb2dpZXMgUm9vdCBDQSAyMDIzMB4XDTIzMDMyMjAz\n");
        stringBuilder.append("NTkxMFoXDTMzMDMyMjAwMDAwMFowgYMxCzAJBgNVBAYTAkVDMRIwEAYDVQQIEwlQ\n");
        stringBuilder.append("aWNoaW5jaGExDjAMBgNVBAcTBVF1aXRvMSYwJAYDVQQKEx1BbHBoYSBUZWNobm9s\n");
        stringBuilder.append("b2dpZXMgQ2lhLiBMdGRhLjEoMCYGA1UEAxMfQWxwaGEgVGVjaG5vbG9naWVzIFJv\n");
        stringBuilder.append("b3QgQ0EgMjAyMzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMruTcGV\n");
        stringBuilder.append("tWwJB+zZe3Mw5EEHBgApZuzIF56f+mOwY8WJTlg50O2NpBxdauHnBsNI1Zpmqzvl\n");
        stringBuilder.append("O469j743p55ENSoJ3/flrFKP6K0LQb0ErpVeMK+rI1DKmAfEFEFnLgBD5s3kGLiL\n");
        stringBuilder.append("CIcB9YxCnHFYDpOJEuJZFFYtlYDLK4I5QxC2ARArD2syd/lK7aBybbU/H9dSpKqv\n");
        stringBuilder.append("mvXio00+toboACyAMCrOmwIepVLY83gdlGbdO7yZyOaHkt43ttV9p6yWG/9asquF\n");
        stringBuilder.append("8M6XJF7FXfNbNALCZVFaUFASNoaRaRzfjuOx/WUNzALqmccUA6q6cxXaQw97lTmU\n");
        stringBuilder.append("DZjU0zdMVjPYQ5cCAwEAAaNCMEAwDgYDVR0PAQH/BAQDAgGGMA8GA1UdEwEB/wQF\n");
        stringBuilder.append("MAMBAf8wHQYDVR0OBBYEFMlov42cAer8lKdFG8vp9AiHCLz0MA0GCSqGSIb3DQEB\n");
        stringBuilder.append("CwUAA4IBAQCay9aEGczL3tuHUFWxoMbtWua9Zorkgi5Feksuq7xibsAxgpftolvA\n");
        stringBuilder.append("sBWxWvCMdnaq1lMad2TsdqtrceW0Yr/SlvDByD0+chNzcMr/dnPHUTn7Wpbc3V/S\n");
        stringBuilder.append("kAOrA8uHDSQUsfitEpi/qiL6io0IRaDkUMeFeTLwaAkfApKdnrJoZt2YAviSK3Az\n");
        stringBuilder.append("a00g8U/a6pceZcmMwnOYC/MnTvSS6R7jlPSCOyQcpr63PoqsI2NekeVjpYLHA9na\n");
        stringBuilder.append("55q5DWFhtnCxFWmKfawTepzVBkrUqrAvn5z+pRJKYxyQXvNSiywabuFsgVMZ96zP\n");
        stringBuilder.append("G5mGLl1Rv6bTqk1JTY9FLrkJfA3CjAdE\n");
        stringBuilder.append("-----END CERTIFICATE-----");
    }
}
