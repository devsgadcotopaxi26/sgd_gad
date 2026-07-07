/*
 * Copyright (C) 2021 
 * Authors: Misael Fernández
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
package ec.gob.firmadigital.libreria.test;

import ec.gob.firmadigital.libreria.certificate.to.Documento;
import ec.gob.firmadigital.libreria.exceptions.InvalidFormatException;
import ec.gob.firmadigital.libreria.exceptions.SignatureVerificationException;
import ec.gob.firmadigital.libreria.utils.PropertiesUtils;

import java.io.File;
import ec.gob.firmadigital.libreria.utils.Utils;
import java.io.IOException;
import static org.junit.Assert.fail;
import org.junit.Test;

public class PdfVerifyTest {

    private static final String PATH = "/home/mfernandez/Test/Verify/";

//    @Test
    public void verifyPdf() throws Exception {
        testVerifyPdf01(PATH + "01.jpg");
        testVerifyPdf02(PATH + "02.pdf");
        testVerifyPdf03(PATH + "03.pdf");
        testVerifyPdf04(PATH + "04.pdf");
        testVerifyPdf05(PATH + "05.pdf");
        testVerifyPdf06(PATH + "06.pdf");
        testVerifyPdf07(PATH + "07.pdf");
        testVerifyPdf08(PATH + "08.pdf");
        testVerifyPdf09(PATH + "09.pdf");
        testVerifyPdf10(PATH + "10.pdf");//50 firmas
        testVerifyPdf11(PATH + "11.pdf");
        testVerifyPdf12(PATH + "12.pdf");
        testVerifyPdf13(PATH + "13.pdf");
        testVerifyPdf14(PATH + "14.pdf");
        testVerifyPdf15(PATH + "15.pdf");
        testVerifyPdf16(PATH + "16.pdf");//
        testVerifyPdf17(PATH + "17.pdf");
        testVerifyPdf18(PATH + "18.pdf");
        testVerifyPdf19(PATH + "19.pdf");
        testVerifyPdf20(PATH + "20.pdf");
        testVerifyPdf21(PATH + "21.pdf");
        testVerifyPdf22(PATH + "22.pdf");
        testVerifyPdf23(PATH + "23.pdf");//
        testVerifyP7m24(PATH + "24.pdf.p7m");//
        testVerifyXml25(PATH + "25.xml");//
    }

    private Documento verificarDocumento(String file) throws IOException, SignatureVerificationException, Exception {
        File document = new File(file);
        Documento documento = Utils.verificarDocumento(document, PropertiesUtils.versionBase64());
        System.out.println("Documento: " + documento);
        if (documento.getCertificados() != null) {
            documento.getCertificados().forEach((certificado) -> {
                System.out.println(certificado.toString());
            });
        } else {
            throw new InvalidFormatException("Documento no soportado");
        }
        return documento;
    }

    /*¿Es archivo PDF?
    NO
    ¿Tiene firma electrónica?
    N/A
    ¿Es de entidad autorizada?
    N/A
    ¿Tiene sello de tiempo? (característi-ca opcional)
    N/A
    ¿Es un certificado íntegro?
    N/A
    ¿Es un certificado vigente?
    N/A
    ¿Es la firma íntegra?
    N/A
    ¿El uso está autorizado para firma electrónica?
    N/A
    ¿Tiene firma vigente? (al momento de firmar el documento)
    N/A
    ¿El documento es íntegro?
    N/A
    Resultado DESEADO al final de la validación
    RECHAZADO*/
    public void testVerifyPdf01(String file) throws Exception {
        try {
            System.out.println("Archivo de imagen JPG");
            Documento documento = verificarDocumento(file);
            if (documento.getError() != null) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    NO
    ¿Tiene firma electrónica?
    N/A
    ¿Es de entidad autorizada?
    N/A
    ¿Tiene sello de tiempo? (característi-ca opcional)
    N/A
    ¿Es un certificado íntegro?
    N/A
    ¿Es un certificado vigente?
    N/A
    ¿Es la firma íntegra?
    N/A
    ¿El uso está autorizado para firma electrónica?
    N/A
    ¿Tiene firma vigente? (al momento de firmar el documento)
    N/A
    ¿El documento es íntegro?
    N/A
    Resultado DESEADO al final de la validación
    RECHAZADO*/
    public void testVerifyPdf02(String file) throws Exception {
        try {
            System.out.println("Documento que no es PDF pero tiene la extensión .pdf");
            Documento documento = verificarDocumento(file);
            if (documento.getError() != null) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    NO
    ¿Es de entidad autorizada?
    N/A
    ¿Tiene sello de tiempo? (característi-ca opcional)
    N/A
    ¿Es un certificado íntegro?
    N/A
    ¿Es un certificado vigente?
    N/A
    ¿Es la firma íntegra?
    N/A
    ¿El uso está autorizado para firma electrónica?
    N/A
    ¿Tiene firma vigente? (al momento de firmar el documento)
    N/A
    ¿El documento es íntegro?
    N/A
    Resultado DESEADO al final de la validación
    RECHAZADO*/
    public void testVerifyPdf03(String file) throws Exception {
        try {
            System.out.println("Documento PDF sin firma electrónica");
            Documento documento = verificarDocumento(file);
            if (documento.getError() != null) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    NO
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    ACEPTADO*/
    public void testVerifyPdf04(String file) throws Exception {
        try {
            System.out.println("PDF con una firma electrónica vigente de la entidad certificadora Consejo de la Judicatura");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() == true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    NO
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    ACEPTADO*/
    public void testVerifyPdf05(String file) throws Exception {
        try {
            System.out.println("PDF con una firma electrónica vigente de la entidad certificadora ANF AC");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() == true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    NO
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    ACEPTADO*/
    public void testVerifyPdf06(String file) throws Exception {
        try {
            System.out.println("PDF con una firma electrónica vigente de la entidad certificadora Banco Central del Ecuador");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() == true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    NO
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    ACEPTADO*/
    public void testVerifyPdf07(String file) throws Exception {
        try {
            System.out.println("PDF con una firma electrónica vigente de la entidad certificadora Security Data");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() == true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    NO
    ¿Es un certificado íntegro?
    NO
    ¿Es un certificado vigente?
    SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    RECHAZADO*/
    public void testVerifyPdf08(String file) throws Exception {
        try {
            System.out.println("PDF con una firma electrónica no vigente de una entidad certificadora extranjera no autorizada en el Ecuador");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() != true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    NO
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    ACEPTADO*/
    public void testVerifyPdf09(String file) throws Exception {
        try {
            System.out.println("PDF con tres firmas, una vigente y dos no vigentes, de la misma entidad certificadora");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() == true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    NO
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    ACEPTADO*/
    public void testVerifyPdf10(String file) throws Exception {
        try {
            System.out.println("PDF que contiene 50 firmas electrónicas vigentes de diversas entidades certificadoras autorizadas");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() == true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    NO
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    ACEPTADO*/
    public void testVerifyPdf11(String file) throws Exception {
        try {
            System.out.println("PDF con una firma no vigente de una entidad certificadora autorizada");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() == true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    NO
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    NO
    Resultado DESEADO al final de la validación
    RECHAZADO*/
    public void testVerifyPdf12(String file) throws Exception {
        try {
            System.out.println("PDF con una firma vigente de una entidad certificadora autorizada y modificado posterior a la firma");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() != true && documento.getSignValidate() == true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    SI
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    ACEPTADO*/
    public void testVerifyPdf13(String file) throws Exception {
        try {
            System.out.println("PDF que contiene una firma revocada firmado durante su vigencia de la entidad certificadora autorizada (Consejo de la Judicatura)");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() == true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    SI
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    ACEPTADO*/
    public void testVerifyPdf14(String file) throws Exception {
        try {
            System.out.println("PDF que contiene una firma no vigente y una firma vigente con sellado de tiempo, de la misma  entidad certificadora autorizada (Consejo de la Judicatura)");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() == true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI/CERTIFICADO FUNCIONARIO PUBLICO CJ NO RECONOCIDO
    ¿Tiene sello de tiempo? (característi-ca opcional)
    SI
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    SI/NO
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    RECHAZADO*/
    public void testVerifyPdf15(String file) throws Exception {
        try {
            System.out.println("PDF que contiene sellado de tiempo vigente y además una firma no vigente de la misma entidad certificadora");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() != true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    SI
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    NO
    Resultado DESEADO al final de la validación
    RECHAZADO*/
    public void testVerifyPdf16(String file) throws Exception {
        try {
            System.out.println("PDF que contiene solamente el sellado de tiempo vigente de una entidad certificadora y modificado posteriormente a dicho sellado");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() != true && documento.getSignValidate() == true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    NO/SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    NO
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    NO/SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    RECHAZADO*/
    public void testVerifyPdf17(String file) throws Exception {
        try {
            System.out.println("PDF con dos firmas, una no vigente de una entidad no autorizada y otra vigente de una entidad autorizada");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() != true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    NO/SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    NO
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    NO/SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    RECHAZADO*/
    public void testVerifyPdf18(String file) throws Exception {
        try {
            System.out.println("PDF con una firma electrónica no vigente de una entidad certificadora extranjera no autorizada en el Ecuador y una firma de una entidad certificadora autorizada");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() != true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    NO/SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    NO
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    NO/SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    NO
    Resultado DESEADO al final de la validación
    RECHAZADO*/
    public void testVerifyPdf19(String file) throws Exception {
        try {
            System.out.println("PDF con una firma electrónica no vigente de una entidad certificadora extranjera no autorizada en el Ecuador y una firma de una entidad certificadora autorizada");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() != true && documento.getSignValidate() != true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI/SI/NO
    ¿Tiene sello de tiempo? (característi-ca opcional)
    NO
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    SI/NO/SI
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    RECHAZADO*/
    public void testVerifyPdf20(String file) throws Exception {
        try {
            System.out.println("PDF con una firma vigente de una entidad certificadora autorizada, una firma no vigente de una entidad certificadora autorizada y una firma no válida de entidad certificadora no autorizada");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() != true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    SI
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    NO
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    NO
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    RECHAZADO*/
    public void testVerifyPdf21(String file) throws Exception {
        try {
            System.out.println("PDF con una firma invisible no vigente de una entidad certificadora autorizada y con sello de tiempo, firmado con un certificado que se encuentra expirado (fuera del plazo de vigencia)");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() != true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    SI
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    NO
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    NO
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    RECHAZADO*/
    public void testVerifyPdf22(String file) throws Exception {
        try {
            System.out.println("PDF con una firma invisible no vigente de una entidad certificadora autorizada y con sello de tiempo, firmado con un certificado que se encuentra revocado y fuera del plazo de vigencia");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() == true && documento.getSignValidate() != true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo PDF?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    SI
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    NO
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    NO
    ¿El documento es íntegro?
    NO
    Resultado DESEADO al final de la validación
    RECHAZADO*/
    public void testVerifyPdf23(String file) throws Exception {
        try {
            System.out.println("PDF con una firma invisible no vigente de una entidad certificadora autorizada y con sello de tiempo, firmado con un certificado que se encuentra expirado y luego archivo modificado");
            Documento documento = verificarDocumento(file);
            if (documento.getDocValidate() != true && documento.getSignValidate() != true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo P7M?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    NO
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    NO
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    ACEPTADO*/
    public void testVerifyP7m24(String file) throws Exception {
        try {
            System.out.println("P7M con una firma electrónica vigente de la entidad certificadora BCE");
            Documento documento = verificarDocumento(file);
            if (documento.getSignValidate() == true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }

    /*¿Es archivo P7M?
    SI
    ¿Tiene firma electrónica?
    SI
    ¿Es de entidad autorizada?
    SI
    ¿Tiene sello de tiempo? (característi-ca opcional)
    NO
    ¿Es un certificado íntegro?
    SI
    ¿Es un certificado vigente?
    NO
    ¿Es la firma íntegra?
    SI
    ¿El uso está autorizado para firma electrónica?
    SI
    ¿Tiene firma vigente? (al momento de firmar el documento)
    SI
    ¿El documento es íntegro?
    SI
    Resultado DESEADO al final de la validación
    ACEPTADO*/
    public void testVerifyXml25(String file) throws Exception {
        try {
            System.out.println("Xml con una firma electrónica vigente de la entidad certificadora ANF");
            Documento documento = verificarDocumento(file);
            if (documento.getSignValidate() == true) {
                System.out.println("Se obtuvo resultado esperado");
            } else {
                fail("Problema en la validación de la clase " + new Object() {
                }.getClass().getEnclosingMethod().getName());
            }
            System.out.println("*******************************************************************************************");
        } catch (Exception e) {
            e.printStackTrace();
            fail("Problemas en el documento");
        }
    }
}
