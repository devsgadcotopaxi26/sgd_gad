/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, APPFIRMAS S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.appfirmas.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado raiz representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por APPFIRMAS S.A.
 *
 * @author Misael Fernández, APPFIRMAS S.A.
 */
public class CaCertAppFirmas20252050 extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public CaCertAppFirmas20252050() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIFszCCA5sCFGEJxWFtrNe7/xoT8TUFc4Qh+0uEMA0GCSqGSIb3DQEBCwUAMIGU\n");
        stringBuilder.append("MQswCQYDVQQGEwJFQzEPMA0GA1UECAwGR1VBWUFTMRIwEAYDVQQHDAlHVUFZQVFV\n");
        stringBuilder.append("SUwxHzAdBgNVBAoMFkFQUEZJUk1BUyBTLkEuIFJvb3QgQUMxHjAcBgNVBAsMFUVO\n");
        stringBuilder.append("VElEQUQgQ0VSVElGSUNBRE9SQTEfMB0GA1UEAwwWQVBQRklSTUFTIFMuQS4gUm9v\n");
        stringBuilder.append("dCBBQzAgFw0yNTA1MDExODM0NDVaGA8yMDUwMDQzMDE4MzQ0NVowgZQxCzAJBgNV\n");
        stringBuilder.append("BAYTAkVDMQ8wDQYDVQQIDAZHVUFZQVMxEjAQBgNVBAcMCUdVQVlBUVVJTDEfMB0G\n");
        stringBuilder.append("A1UECgwWQVBQRklSTUFTIFMuQS4gUm9vdCBBQzEeMBwGA1UECwwVRU5USURBRCBD\n");
        stringBuilder.append("RVJUSUZJQ0FET1JBMR8wHQYDVQQDDBZBUFBGSVJNQVMgUy5BLiBSb290IEFDMIIC\n");
        stringBuilder.append("IjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAi/VC93M7Rh+vSRpYMI89Y6Wr\n");
        stringBuilder.append("y2ZJJe4NxuQr73skIldyxen7yGvO+DCHIxQTlrKJ2ImbPE2fUI0SuI0OvsHqSgm0\n");
        stringBuilder.append("B4emlxKGvxtfKXGRJrcTHmn7KxdLLRoobY/0+VXAssoBQhf140zReEOwjww8jFNL\n");
        stringBuilder.append("k/THPGYgOkJOggTOEHmmtq7I8+fZ03TJU/ah8kJpI7eu6E73vTAJZiXXrBiu83IF\n");
        stringBuilder.append("2sGKQcrNqFUhaogMCm+wefcnH+w73HBJ4MRteHJy003mhILkTEruagVIPSMe0NNU\n");
        stringBuilder.append("FqTwjRvWEF3Av63F0xKpkU9qdHgj6SfXxR/rl224T4Thk9DRb/kXYvhn1jKNA2qv\n");
        stringBuilder.append("2Rq88dAh4ybG9jswbm/evNvd1ZmChvH7JXi53fXRINbnPnlPwInaT+B6NlT1s+eN\n");
        stringBuilder.append("9SsuER+a0Ru5L6qt3wddV2+kg2Csbr46IzAqP98I/iDaYKoOFPwUz3e4PUaiw6cy\n");
        stringBuilder.append("oO9Sy0OBPgZY4wmmprKtakg2/Wi4RXjUuEbj7rEqb7aIHDA2H4BiQeYmiI9iMtrA\n");
        stringBuilder.append("77HSgMw8wzMEhlVLgTsoJERJJ3pLmHIXIfAgsHADwaCOJ1us1rCc3D0TO/3lGbVi\n");
        stringBuilder.append("54Wvs+voCGhqjdX8EGKr3uXroldXNa61GeG3oPRE04fHUpLFnj9P+NPta2HCkk7D\n");
        stringBuilder.append("ODwCM7yE2hb+DkbztZUCAwEAATANBgkqhkiG9w0BAQsFAAOCAgEAdHCdoqAB5d8A\n");
        stringBuilder.append("ljdf7/tV6wqxp+7Wf4sBAULLn9BZVX5Plia29TQjRU3vzjZ+/NRMQ8DPg9uRHeAz\n");
        stringBuilder.append("xjlyNqDjnGqV7zs+YWfjZhvnVdZ06jPxHv+YFgKePCWAuTVj1hb3kOIyY6ObRCya\n");
        stringBuilder.append("9wOUL+/NSgrGu9klSH2LTsYSPpDyM/K70u1wOa2d5dMaQ32nHLJQjf33XUL0aEwi\n");
        stringBuilder.append("vL71Dlyf1NWYvPZ95lYbSwBMtrASJtZbjHoPmQ/lt4U5XszFNrqm6JAe9MFO8J9C\n");
        stringBuilder.append("1Zy7XcUVEjK3E+E6CaGMvGZRbi9dbkM0bnt04DvIl51jaK0jn1ZkYHGp8wn1a3Gv\n");
        stringBuilder.append("fnGh1A3tKtcTL31xc61GQ5oPwYvPHR0oXz0SqCy5MnPJR4AQ9OEbz9H3boUCmopE\n");
        stringBuilder.append("sUwAw3PZ3KyYbiXuR7ejE2/gTyShksa5PsdJvr0GhCtVPiaVvpzIqmo9xCHvDJgi\n");
        stringBuilder.append("/hq44F4mn392C8DFsAzSYEhRJ1K/bnI9d+RRgVgdfFUwwBnAjcwT3eQoE2RQGxoo\n");
        stringBuilder.append("YMUjDXlfrpViGdS4P+4zmR+9jHz2+CD7/mi4PBEv/UibLfWnQUSjrwTAazZ7o/wi\n");
        stringBuilder.append("BmhHCshQurNherbIBcoOfdSjlKOt7gmpxAjLXO+4a4BbxiTw+v4PuPCg+13BI+14\n");
        stringBuilder.append("jqPmy+ema4E6TPRglPtQc+bkm/sX/cA=\n");
        stringBuilder.append("-----END CERTIFICATE-----");
    }
}
