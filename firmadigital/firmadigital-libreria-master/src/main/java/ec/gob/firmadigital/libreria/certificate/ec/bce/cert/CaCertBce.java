/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, BANCO CENTRAL DEL ECUADOR
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
package ec.gob.firmadigital.libreria.certificate.ec.bce.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado raiz representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por BANCO CENTRAL DEL ECUADOR
 *
 * @author Misael Fernández, BANCO CENTRAL DEL ECUADOR
 */
public class CaCertBce extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public CaCertBce() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIJMzCCBxugAwIBAgIETj/6bTANBgkqhkiG9w0BAQsFADCBwjELMAkGA1UEBhMC\n");
        stringBuilder.append("RUMxIjAgBgNVBAoTGUJBTkNPIENFTlRSQUwgREVMIEVDVUFET1IxNzA1BgNVBAsT\n");
        stringBuilder.append("LkVOVElEQUQgREUgQ0VSVElGSUNBQ0lPTiBERSBJTkZPUk1BQ0lPTi1FQ0lCQ0Ux\n");
        stringBuilder.append("DjAMBgNVBAcTBVFVSVRPMUYwRAYDVQQDEz1BVVRPUklEQUQgREUgQ0VSVElGSUNB\n");
        stringBuilder.append("Q0lPTiBSQUlaIERFTCBCQU5DTyBDRU5UUkFMIERFTCBFQ1VBRE9SMB4XDTExMDgw\n");
        stringBuilder.append("ODE0MzIwNVoXDTMxMDgwODE1MDIwNVowgcIxCzAJBgNVBAYTAkVDMSIwIAYDVQQK\n");
        stringBuilder.append("ExlCQU5DTyBDRU5UUkFMIERFTCBFQ1VBRE9SMTcwNQYDVQQLEy5FTlRJREFEIERF\n");
        stringBuilder.append("IENFUlRJRklDQUNJT04gREUgSU5GT1JNQUNJT04tRUNJQkNFMQ4wDAYDVQQHEwVR\n");
        stringBuilder.append("VUlUTzFGMEQGA1UEAxM9QVVUT1JJREFEIERFIENFUlRJRklDQUNJT04gUkFJWiBE\n");
        stringBuilder.append("RUwgQkFOQ08gQ0VOVFJBTCBERUwgRUNVQURPUjCCAiIwDQYJKoZIhvcNAQEBBQAD\n");
        stringBuilder.append("ggIPADCCAgoCggIBALw9wH7DgFMR3kHUp72Wpug1N8JWFRthnhqxMWxOXVnGoYbG\n");
        stringBuilder.append("sdVTaycXSeVnWt03AZDGw8x7FNh3A2Hh9vtOZGnFCOWJZyDqF5KiGHN6Jiy1mAD4\n");
        stringBuilder.append("qAgFghWCh78OBO19ThI3PAflevMwqnWF5DJsqBdV8lqvOh8L5DX54PDYcs2zXlBI\n");
        stringBuilder.append("76hz/Ye4BXI1dMSmlKbAVaiBMMG+Ye/szAL4RQCZNpyi65nbgXKztbvWjwJiJIbW\n");
        stringBuilder.append("KND9Cu40+wZ6tm+OcTKyNQfhvdSfqRZ7tQv2LDwhPotuztyS6RljyMyNe1l3A6hW\n");
        stringBuilder.append("D/JnS65gHi46H0WjrRqtH5ObqhTEwZszOPdU32VFcLhUtZhPQp0M74Wa2dXy9d+s\n");
        stringBuilder.append("DBCdI9GZcaY+nzaNMbPEdT5lFg1Uc6ksWbWvj5udZMBhygZj1PtaWFjmqpZcdd9v\n");
        stringBuilder.append("Z29GGbOtKB6bx162YGaK5sGjB385WVDRAi6Uzjl+0CpoDJjP7YS9tZrXlDs4gepp\n");
        stringBuilder.append("KETthU2cpk73jYflzBeFFavuxNHGk6cVNgFrrhht0X0/eMhgq0Go4NUyY11g/r7f\n");
        stringBuilder.append("3Upf0YR7OxOacjDbLpIbNxzeH2htcD0zpyS485TWnBnarjBhgO1ywQmRQ/Ryl8Zq\n");
        stringBuilder.append("u7eWKBOfk++hibqJNfeLwEY3uBGoITbTXpBiX2u6U86bRGHES0Cm6mud5xErAgMB\n");
        stringBuilder.append("AAGjggMtMIIDKTB8BgNVHSAEdTBzMHEGCisGAQQBgqg7AQEwYzBhBggrBgEFBQcC\n");
        stringBuilder.append("ARZVaHR0cDovL3d3dy5lY2kuYmNlLmVjL2F1dG9yaWRhZC1jZXJ0aWZpY2FjaW9u\n");
        stringBuilder.append("L2RlY2xhcmFjaW9uLXByYWN0aWNhcy1jZXJ0aWZpY2FjaW9uLnBkZjARBglghkgB\n");
        stringBuilder.append("hvhCAQEEBAMCAAcwggHtBgNVHR8EggHkMIIB4DCCAdygggHYoIIB1KSB1DCB0TEL\n");
        stringBuilder.append("MAkGA1UEBhMCRUMxIjAgBgNVBAoTGUJBTkNPIENFTlRSQUwgREVMIEVDVUFET1Ix\n");
        stringBuilder.append("NzA1BgNVBAsTLkVOVElEQUQgREUgQ0VSVElGSUNBQ0lPTiBERSBJTkZPUk1BQ0lP\n");
        stringBuilder.append("Ti1FQ0lCQ0UxDjAMBgNVBAcTBVFVSVRPMUYwRAYDVQQDEz1BVVRPUklEQUQgREUg\n");
        stringBuilder.append("Q0VSVElGSUNBQ0lPTiBSQUlaIERFTCBCQU5DTyBDRU5UUkFMIERFTCBFQ1VBRE9S\n");
        stringBuilder.append("MQ0wCwYDVQQDEwRDUkwxhoH6bGRhcDovL2JjZXFsZGFwcmFpenAuYmNlLmVjL2Nu\n");
        stringBuilder.append("PUNSTDEsY249QVVUT1JJREFEJTIwREUlMjBDRVJUSUZJQ0FDSU9OJTIwUkFJWiUy\n");
        stringBuilder.append("MERFTCUyMEJBTkNPJTIwQ0VOVFJBTCUyMERFTCUyMEVDVUFET1IsbD1RVUlUTyxv\n");
        stringBuilder.append("dT1FTlRJREFEJTIwREUlMjBDRVJUSUZJQ0FDSU9OJTIwREUlMjBJTkZPUk1BQ0lP\n");
        stringBuilder.append("Ti1FQ0lCQ0Usbz1CQU5DTyUyMENFTlRSQUwlMjBERUwlMjBFQ1VBRE9SLGM9RUM/\n");
        stringBuilder.append("YXV0aG9yaXR5UmV2b2NhdGlvbkxpc3Q/YmFzZTArBgNVHRAEJDAigA8yMDExMDgw\n");
        stringBuilder.append("ODE0MzIwNVqBDzIwMzEwODA4MTUwMjA1WjALBgNVHQ8EBAMCAQYwHwYDVR0jBBgw\n");
        stringBuilder.append("FoAUqBAVqN+gmczo6M/ubUbv6hbSCswwHQYDVR0OBBYEFKgQFajfoJnM6OjP7m1G\n");
        stringBuilder.append("7+oW0grMMAwGA1UdEwQFMAMBAf8wHQYJKoZIhvZ9B0EABBAwDhsIVjguMDo0LjAD\n");
        stringBuilder.append("AgSQMA0GCSqGSIb3DQEBCwUAA4ICAQCt5F5DaFGcZqrQ5uKKrk2D1KD2DlNbniaK\n");
        stringBuilder.append("IwJfZ36tLYUuyu7VmLZZdrVKqjC+FYAZIQJn/q2w/0JN5I5YK+Yj1UEa9nlmshRH\n");
        stringBuilder.append("aCEJXZokLXFjD4ZayiZgJh7OcMEV7G9VFFP2WF4iDflSG0drhn152Fllh+y1ZHov\n");
        stringBuilder.append("hX6TlCT0y5iAq+zzq2Utu6Gs1SU5U7fCC7gNYOeztPehqlnSTaD1xAbqnTVOBS1Z\n");
        stringBuilder.append("hoCQio5vF98TS36ItfjDA0bO12FiJKOLx9WNiimDxy0KIFSfifD1FfmUO5MYgcke\n");
        stringBuilder.append("CTLnkGHtCadhpEsy6HwHeeuLNPkp5DMGJeBX1XAjVC50ulw36lXuryJ9/FRBpbdg\n");
        stringBuilder.append("uLJIssFndQlr6klA5LdK44yFVr3+1d+59fNuiFQnKQV7bFQfApv5FqvqyfNEEI1K\n");
        stringBuilder.append("1prM82aq24xDT5OwsyRnf+F7p6OwQTYmGYkrGH5RlqFI+XC8ckMip3XecFb6Qyur\n");
        stringBuilder.append("kaA/286eYUOZiJpPgn/qlisNreF0GTLi9tBzExGCD+BdsYGqMu/gx8lgMbF3b+HK\n");
        stringBuilder.append("eQe8+kExkb7LVYhbTlOBZzB0da/cDmvg1V+pgrXu0qUX/YnQyybnA9nyQdLj60/3\n");
        stringBuilder.append("sUlWyxURbu33kTNnrPJmcHjRa561Co84NYKifLrDSgAChLQry/eItvhzFYu33Td9\n");
        stringBuilder.append("TkHa++TQjg==\n");
        stringBuilder.append("-----END CERTIFICATE-----");
    }
}
