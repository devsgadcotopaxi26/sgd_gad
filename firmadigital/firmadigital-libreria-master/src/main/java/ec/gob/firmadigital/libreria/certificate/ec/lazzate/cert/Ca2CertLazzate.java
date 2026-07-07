/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, LAZZATE CIA. LTDA.
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
package ec.gob.firmadigital.libreria.certificate.ec.lazzate.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado raiz representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por LAZZATE CIA. LTDA.
 *
 * @author Misael Fernández, LAZZATE CIA. LTDA.
 */
public class Ca2CertLazzate extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public Ca2CertLazzate() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIFFDCCA/ygAwIBAgIUfM+ZZPeqa433G8xeter+WEwh8b8wDQYJKoZIhvcNAQEL\n");
        stringBuilder.append("BQAwgYkxCzAJBgNVBAYTAkVDMRIwEAYDVQQIDAlQSUNISU5DSEExDjAMBgNVBAcM\n");
        stringBuilder.append("BVFVSVRPMRswGQYDVQQKDBJMYXp6YXRlIENpYS4gTHRkYS4xHjAcBgNVBAsMFUVu\n");
        stringBuilder.append("dGUgZGUgQ2VydGlmaWNhY2lvbjEZMBcGA1UEAwwQTGF6emF0ZSBSb290IENBMjAg\n");
        stringBuilder.append("Fw0yMzExMjkyMjEzMzRaGA8yMDUzMTEyMTIyMTMzNFowgYkxCzAJBgNVBAYTAkVD\n");
        stringBuilder.append("MRIwEAYDVQQIDAlQSUNISU5DSEExDjAMBgNVBAcMBVFVSVRPMRswGQYDVQQKDBJM\n");
        stringBuilder.append("YXp6YXRlIENpYS4gTHRkYS4xHjAcBgNVBAsMFUVudGUgZGUgQ2VydGlmaWNhY2lv\n");
        stringBuilder.append("bjEZMBcGA1UEAwwQTGF6emF0ZSBSb290IENBMjCCASIwDQYJKoZIhvcNAQEBBQAD\n");
        stringBuilder.append("ggEPADCCAQoCggEBANPsnG57spuO8mGSQcl/qb9srQCERlPpqzwEnR4H8URwDPXV\n");
        stringBuilder.append("W1lrEsl8GGeFKOkUDxWLBKVRmhRNbpUXadB0dYTj8TEzCWPhMTb66t2v70qB9pFa\n");
        stringBuilder.append("7ywsnie0+IU6MrE91nimknPIpk2sbyTt0BW4uHzZYQ0mZvufaBrSatLYuip8qzcy\n");
        stringBuilder.append("AjCxZNynhc41v9kceY1p/sN+wkF7huS3VTmXQLeI7+QHWBRNta/Z361Tv2daGqsR\n");
        stringBuilder.append("viT+bodP3PSHK49eT4iVRj2W5MEGGejv0oZYtUzVU7DaZX5OC51fnBroL8EuxtBj\n");
        stringBuilder.append("6dCMgvNeAqAMqFx2avW808AngWdSZ7EhdF4cO50CAwEAAaOCAW4wggFqMB0GA1Ud\n");
        stringBuilder.append("DgQWBBQSyTRfn3cPf1bel04Kk50Tp3BtxzAfBgNVHSMEGDAWgBQSyTRfn3cPf1be\n");
        stringBuilder.append("l04Kk50Tp3BtxzAOBgNVHQ8BAf8EBAMCAYYwEgYDVR0TAQH/BAgwBgEB/wIBAjA0\n");
        stringBuilder.append("BgNVHR8ELTArMCmgJ6AlhiNodHRwOi8vZW5leDIueHl6L2NybC9sYXp6YXRlQ0Ex\n");
        stringBuilder.append("LmNybDCBzQYDVR0gBIHFMIHCMIG/BgkrBgEEAYPPdgEwgbEwQQYIKwYBBQUHAgEW\n");
        stringBuilder.append("NWh0dHBzOi8vZW5leHQuZWMvZGVzY2FyZ2FzL3BvbGl0aWNhcy9jZXJ0aWZpY2Fk\n");
        stringBuilder.append("b3MucGRmMGwGCCsGAQUFBwICMGAaXkVsIHByZXNlbnRlIGNlcnRpZmljYWRvIGVz\n");
        stringBuilder.append("IGVtaXRpZG8gZW4gYmFzZSBhIGxhcyBwb2zDrXRpY2FzIGRlIHNlZ3VyaWRhZCBk\n");
        stringBuilder.append("ZSBMYXp6YXRlIENpYS4gTHRkYS4wDQYJKoZIhvcNAQELBQADggEBADGX3Q7+ptYr\n");
        stringBuilder.append("yrHxyp/GbEvfcclRswoQ1JXnV/bDq+0oQhsFBfHQ79N+ulQY87F5u/Qj0Hid+rMg\n");
        stringBuilder.append("ABZui1omJe8L6j7Gs5RbJgr64KDAY9/ukAGUhjgZG2qw03rpu7njRl/cF45HKilq\n");
        stringBuilder.append("khu1Jt+L0AicukoHoKqpe5+qfDvgAGuvdzbjKDI6HRl/6y/gLgzCl4Zkd0SWuI8P\n");
        stringBuilder.append("rLjkicM6J0KafQA1d3gwSEYc3OyT9hzOWD4laLALWUnA9AUQz9tC6ChDaN897Wsu\n");
        stringBuilder.append("9yLlXH2pg+aR+R2chedkiEYfwul6o1fqVjwG5Oypd+E8lGH4BCKNCmZFfIXiJGlt\n");
        stringBuilder.append("Uoct5bQJQEk=\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }
}
