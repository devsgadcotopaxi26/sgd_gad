/*
 * Copyright (C) 2025
 * Author: Misael Fernández
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
package ec.gob.firmadigital.libreria.utils;

import com.itextpdf.kernel.pdf.PdfArray;
import com.itextpdf.kernel.pdf.PdfDictionary;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfName;
import com.itextpdf.kernel.pdf.PdfNameTree;
import com.itextpdf.kernel.pdf.PdfObject;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfString;
import com.itextpdf.kernel.pdf.annot.PdfAnnotation;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 *
 * @author Misael Fernández
 */
public class CheckPDF {

    private static String checkPDF;
    private static final Logger LOGGER = Logger.getLogger(CheckPDF.class.getName());

    private static void getJavaScriptFromPdfArray(PdfArray pdfArray, StringBuilder stringBuilder) {
        if (pdfArray == null) {
            return;
        }
        for (PdfObject pdfObject : pdfArray) {
            // To get same output as getJavaScriptUsingiText559(), not appending String values found in array to strBuf
            if (pdfObject == null) {
                continue;
            } else if (pdfObject.isDictionary()) {
                getJavaScriptFromPdfDictionary((PdfDictionary) pdfObject, stringBuilder);
            } else if (pdfObject.isArray()) {
                getJavaScriptFromPdfArray((PdfArray) pdfObject, stringBuilder);
            }
        }
    }

    private static void getJavaScriptFromPdfDictionary(PdfDictionary pdfDictionary, StringBuilder stringBuilder) {
        if (pdfDictionary == null) {
            return;
        }
        PdfObject pdfObject = pdfDictionary.get(PdfName.JS);
        if (pdfObject == null) {
            return;
        }
        if (pdfObject.isString()) {
            stringBuilder.append(((PdfString) pdfObject).getValue());
        } else if (pdfObject.isDictionary()) {
            getJavaScriptFromPdfDictionary((PdfDictionary) pdfObject, stringBuilder);
        } else if (pdfObject.isArray()) {
            getJavaScriptFromPdfArray((PdfArray) pdfObject, stringBuilder);
        }
    }

    private static String getPdfObject(PdfObject pdfObject) {
        StringBuilder stringBuilder = new StringBuilder();
        if (pdfObject != null) {
            if (pdfObject.isDictionary()) {
                getJavaScriptFromPdfDictionary((PdfDictionary) pdfObject, stringBuilder);
            } else if (pdfObject.isArray()) {
                getJavaScriptFromPdfArray((PdfArray) pdfObject, stringBuilder);
            } else if (pdfObject.isString()) {
                stringBuilder.append(((PdfString) pdfObject).getValue());
            } else if (pdfObject.isName()) {
                stringBuilder.append(((PdfName) pdfObject).getValue());
            } else {
                stringBuilder.append(pdfObject);
            }
        }
        return stringBuilder.toString().trim();
    }

    public static String checkPDF(PdfDocument pdfDocument) {
        checkPDF = "";
        //To get javascript that is added through OpenAction
        PdfDictionary pdfDictionaryCatalog = pdfDocument.getCatalog().getPdfObject();
        PdfDictionary namesDictionary = pdfDictionaryCatalog.getAsDictionary(PdfName.OpenAction);
        if (namesDictionary != null && !namesDictionary.isEmpty()) {
            String openAction = "";
            PdfObject pdfObject = namesDictionary.get(PdfName.JS);
            if (pdfObject != null) {
                openAction += "\n" + PdfName.JS.getValue() + ": " + getPdfObject(pdfObject);
            }
            pdfObject = namesDictionary.get(PdfName.URI);
            if (pdfObject != null) {
                openAction += "\n" + PdfName.URI.getValue() + ": " + getPdfObject(pdfObject);
            }
            pdfObject = namesDictionary.get(PdfName.S);
            if (pdfObject != null) {
                openAction += "\n" + PdfName.S.getValue() + ": " + getPdfObject(pdfObject);
            }
            pdfObject = namesDictionary.get(PdfName.EmbeddedFile);
            if (pdfObject != null) {
                openAction += "\n" + PdfName.EmbeddedFile.getValue() + ": " + getPdfObject(pdfObject);
            }
            pdfObject = namesDictionary.get(PdfName.EmbeddedFiles);
            if (pdfObject != null) {
                openAction += "\n" + PdfName.EmbeddedFiles.getValue() + ": " + getPdfObject(pdfObject);
            }
            if (!openAction.isEmpty()) {
                checkPDF = "OpenAction:" + openAction;
            }
        }
        // To get java script available from NAMES dictionary 
//        namesDictionary = pdfDictionaryCatalog.getAsDictionary(PdfName.Names);
//        if (namesDictionary != null && !namesDictionary.isEmpty()) {
//            String javaScript = "";
//            PdfDictionary javascriptDictionary = namesDictionary.getAsDictionary(PdfName.JavaScript);
//            if (javascriptDictionary != null) {
//                StringBuilder stringBuilder = new StringBuilder();
//                Set<Map.Entry<PdfName, PdfObject>> set = javascriptDictionary.entrySet();
//                for (Map.Entry<PdfName, PdfObject> entry : set) {
//                    PdfObject pdfObject = entry.getValue();
//                    javaScript += "\n" + getPdfObject(pdfObject);
//                }
//                checkPDF += "\n" + stringBuilder.toString().trim();
//            }
//            if (!javaScript.isEmpty()) {
//                checkPDF += "Names Dictionary - JavaScript:" + javaScript;
//            }
//        }
        // To get java script from name tree JAVASCRIPT
//        PdfNameTree nameTree = pdfDocument.getCatalog().getNameTree(PdfName.JavaScript);
//        if (nameTree != null && !nameTree.getNames().isEmpty()) {
//            String javaScript = "";
//            Map<String, PdfObject> objs = nameTree.getNames();
//            if (objs != null) {
//                StringBuilder stringBuilder = new StringBuilder();
//                for (Map.Entry<String, PdfObject> entry : objs.entrySet()) {
//                    PdfObject pdfObject = entry.getValue();
//                    javaScript += "\n" + getPdfObject(pdfObject);
//                }
//                checkPDF += "\n" + stringBuilder.toString().trim();
//            }
//            if (!javaScript.isEmpty()) {
//                checkPDF += "Name Tree - JavaScript" + javaScript;
//            }
//        }
        // To get java script at the annotation action level
        String javaScriptAnnotation = "";
        for (int i = 1; i <= pdfDocument.getNumberOfPages(); i++) {
            PdfPage page = pdfDocument.getPage(i);
            List<PdfAnnotation> annotList = page.getAnnotations();
            if (annotList != null) {
                for (PdfAnnotation pdfAnnotation : annotList) {
                    if (pdfAnnotation.getPdfObject() != null) {
                        PdfDictionary annotationAction = pdfAnnotation.getPdfObject().getAsDictionary(PdfName.A);
                        if (annotationAction != null && PdfName.JavaScript.equals(annotationAction.get(PdfName.S))) {
                            PdfString javascript = annotationAction.getAsString(PdfName.JS);
                            if (javascript != null) {
                                checkPDF += "\n" + javascript;
                            }
                        }
                    }
                }
            }
        }
        if (!javaScriptAnnotation.isEmpty()) {
            checkPDF += "Annotation Action Level - JavaScript" + javaScriptAnnotation;
        }
        if (!checkPDF.isEmpty()) {
            LOGGER.log(Level.WARNING, checkPDF.trim());
            checkPDF = "El documento es potencialmente sospechoso para procesarlo";
        }
//////////
//        PdfDictionary rootDictionary = pdfDocument.getTrailer().getAsDictionary(PdfName.Root).getAsDictionary(PdfName.OpenAction);
//        if (rootDictionary != null) {
//            rootDictionary.entrySet().forEach(entry -> {
//                if (entry.getKey().getValue().equals("Type")) {
//                    checkPDF += "Type: " + entry.getValue().toString().trim() + "\n";
//                }
//                if (entry.getKey().getValue().equals("JS")) {
//                    checkPDF += "JS: " + entry.getValue().toString().trim() + "\n";
//                }
//                if (entry.getKey().getValue().equals("S")) {
//                    checkPDF += "S: " + entry.getValue().toString().trim() + "\n";
//                }
//            });
//            if (checkPDF != null) {
//                LOGGER.log(Level.WARNING, "PdfName.OpenAction:\n{0}", checkPDF.trim());
//                checkPDF = "El documento es potencialmente sospechoso para procesarlo";
//            }
//        }
//////////
        return checkPDF.isEmpty() ? null : checkPDF;
    }
}
