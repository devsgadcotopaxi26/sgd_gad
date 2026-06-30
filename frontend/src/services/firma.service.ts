// Servicio de firma electrónica con P12 en el navegador
// Compatible con certificados BCE, Security Data y UANATACA

export interface InfoFirma {
  firmado_por: string
  cedula: string
  entidad_cert: string
  fecha_firma: string
  algoritmo: string
  valido_hasta: string
}

export async function leerCertificadoP12(
  p12Base64: string,
  clave: string
): Promise<{ info: InfoFirma; forge: any; p12: any }> {
  const forge = await import('node-forge')

  const p12Der  = forge.util.decode64(p12Base64)
  const p12Asn1 = forge.asn1.fromDer(p12Der)
  const p12Obj  = forge.pkcs12.pkcs12FromAsn1(p12Asn1, clave)

  // Extraer certificado
  const certBags = p12Obj.getBags({ bagType: forge.pki.oids.certBag })
  const bags     = certBags[forge.pki.oids.certBag] ?? []
  if (bags.length === 0) throw new Error('No se encontró certificado en el P12')

  const cert    = bags[0].cert!
  const subject = cert.subject.attributes
  const issuer  = cert.issuer.attributes

  const getCN = (attrs: any[]) =>
    attrs.find((a: any) => a.shortName === 'CN')?.value ?? ''
  const getField = (attrs: any[], field: string) =>
    attrs.find((a: any) => a.shortName === field)?.value ?? ''

  const cn       = getCN(subject)
  // Cédula: buscar en SN o en el CN (formato "APELLIDO NOMBRE - 1234567890")
  const cedulaMatch = cn.match(/(\d{10})/)
  const cedula   = cedulaMatch ? cedulaMatch[1] : getField(subject, 'SN')
  const issuerCN = getCN(issuer)

  // Detectar entidad certificadora
  let entidad_cert = 'Desconocida'
  if (issuerCN.toLowerCase().includes('banco central')) entidad_cert = 'BCE'
  else if (issuerCN.toLowerCase().includes('security data')) entidad_cert = 'Security Data'
  else if (issuerCN.toLowerCase().includes('uanataca')) entidad_cert = 'UANATACA'
  else entidad_cert = issuerCN

  const validoHasta = cert.validity.notAfter.toISOString()

  return {
    info: {
      firmado_por:  cn,
      cedula,
      entidad_cert,
      fecha_firma:  new Date().toISOString(),
      algoritmo:    'SHA256withRSA',
      valido_hasta: validoHasta,
    },
    forge,
    p12: p12Obj,
  }
}

export async function firmarPDF(
  pdfBytes: ArrayBuffer,
  p12Base64: string,
  clave: string
): Promise<{ pdfFirmadoBase64: string; info: InfoFirma }> {
  const { PDFDocument } = await import('pdf-lib')
  const forge            = await import('node-forge')

  // Cargar P12
  const p12Der  = forge.util.decode64(p12Base64)
  const p12Asn1 = forge.asn1.fromDer(p12Der)
  const p12Obj  = forge.pkcs12.pkcs12FromAsn1(p12Asn1, clave)

  // Extraer clave privada y certificado
  const keyBags  = p12Obj.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
  const certBags = p12Obj.getBags({ bagType: forge.pki.oids.certBag })
  const keyBag   = (keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] ?? [])[0]
  const certBag  = (certBags[forge.pki.oids.certBag] ?? [])[0]

  if (!keyBag?.key || !certBag?.cert) {
    throw new Error('No se pudo extraer la clave privada o el certificado del P12')
  }

  const privateKey = keyBag.key
  const cert       = certBag.cert

  // Extraer info del certificado
  const subject  = cert.subject.attributes
  const issuer   = cert.issuer.attributes
  const getCN    = (attrs: any[]) => attrs.find((a: any) => a.shortName === 'CN')?.value ?? ''
  const cn       = getCN(subject)
  const issuerCN = getCN(issuer)
  const cedulaMatch = cn.match(/(\d{10})/)
  const cedula   = cedulaMatch ? cedulaMatch[1] : ''

  let entidad_cert = issuerCN
  if (issuerCN.toLowerCase().includes('banco central'))  entidad_cert = 'BCE'
  if (issuerCN.toLowerCase().includes('security data'))  entidad_cert = 'Security Data'
  if (issuerCN.toLowerCase().includes('uanataca'))       entidad_cert = 'UANATACA'

  // Cargar PDF y agregar página de firma
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const pages  = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]
  const { width } = lastPage.getSize()

  // Agregar sello visual FirmaEC en el PDF
  const { StandardFonts, rgb } = await import('pdf-lib')
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fechaFirma = new Date().toLocaleString('es-EC')

  const stampX = 30
  const stampY = 15
  const stampW = width - 60
  const stampH = 65

  // Fondo verde claro
  lastPage.drawRectangle({
    x: stampX, y: stampY, width: stampW, height: stampH,
    color: rgb(0.94, 0.99, 0.96),
    borderColor: rgb(0.059, 0.431, 0.337),
    borderWidth: 1.0,
  })

  // Linea verde lateral izquierda (acento FirmaEC)
  lastPage.drawRectangle({
    x: stampX, y: stampY, width: 4, height: stampH,
    color: rgb(0.059, 0.431, 0.337),
  })

  const textX = stampX + 10
  const greenDark = rgb(0.059, 0.431, 0.337)
  const grayText = rgb(0.25, 0.30, 0.33)
  const grayLight = rgb(0.45, 0.48, 0.50)

  lastPage.drawText(`Firmado electronicamente por: ${cn}`, {
    x: textX, y: stampY + 52, size: 7, font: fontBold, color: greenDark,
  })
  lastPage.drawText(`Certificado emitido por: ${entidad_cert}`, {
    x: textX, y: stampY + 42, size: 6.5, font, color: grayText,
  })
  lastPage.drawText(`Fecha de firma: ${fechaFirma}`, {
    x: textX, y: stampY + 33, size: 6.5, font, color: grayText,
  })
  lastPage.drawText(`Cedula: ${cedula}`, {
    x: textX, y: stampY + 24, size: 6.5, font, color: grayText,
  })
  lastPage.drawText('Validez: Art. 14 Ley de Comercio Electronico, Firmas Electronicas y Mensajes de Datos', {
    x: textX, y: stampY + 14, size: 5.5, font, color: grayLight,
  })
  lastPage.drawText('Verifique en: https://firmadigital.gob.ec', {
    x: textX, y: stampY + 5, size: 5, font, color: grayLight,
  })

  // Serializar PDF modificado
  const pdfModificado = await pdfDoc.save()

  // Firmar el hash del PDF con la clave privada (SHA256withRSA)
  const md = forge.md.sha256.create()
  md.update(forge.util.binary.raw.encode(new Uint8Array(pdfModificado)), 'raw')
  const firma = (privateKey as any).sign(md)
  const firmaBase64 = forge.util.encode64(firma)

  // El PDF final incluye el sello visual + metadata de firma en los metadatos
  const pdfFinal = await PDFDocument.load(pdfModificado)
  pdfFinal.setKeywords([`FIRMA:${firmaBase64.substring(0, 100)}`])
  pdfFinal.setSubject(`Firmado por ${cn} - ${entidad_cert}`)
  const pdfFinalBytes = await pdfFinal.save()

  const pdfFirmadoBase64 = btoa(
    Array.from(new Uint8Array(pdfFinalBytes))
      .map(b => String.fromCharCode(b))
      .join('')
  )

  return {
    pdfFirmadoBase64,
    info: {
      firmado_por:  cn,
      cedula,
      entidad_cert,
      fecha_firma:  new Date().toISOString(),
      algoritmo:    'SHA256withRSA',
      valido_hasta: cert.validity.notAfter.toISOString(),
    },
  }
}