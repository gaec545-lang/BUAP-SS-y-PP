import jsPDF from 'jspdf'
import type { Student } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function randomFolio(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function todayFormatted(): string {
  const d = new Date()
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared header builder
// ─────────────────────────────────────────────────────────────────────────────

function buildHeader(doc: jsPDF): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  // Institution name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('BENEMÉRITA UNIVERSIDAD AUTÓNOMA DE PUEBLA', pageWidth / 2, y, {
    align: 'center',
  })
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Facultad de Administración', pageWidth / 2, y, { align: 'center' })
  y += 6

  doc.setFontSize(9)
  doc.text(
    'Coordinación de Prácticas Profesionales y Comunicación',
    pageWidth / 2,
    y,
    { align: 'center' }
  )
  y += 8

  // Horizontal line
  doc.setDrawColor(180, 180, 180)
  doc.line(20, y, pageWidth - 20, y)
  y += 8

  return y
}

// ─────────────────────────────────────────────────────────────────────────────
// Student data section
// ─────────────────────────────────────────────────────────────────────────────

function buildStudentSection(doc: jsPDF, student: Student, startY: number): number {
  let y = startY
  const leftCol = 20
  const labelWidth = 42
  const valueX = leftCol + labelWidth

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DATOS DEL ALUMNO', leftCol, y)
  y += 5

  doc.setDrawColor(220, 220, 220)
  doc.line(leftCol, y, doc.internal.pageSize.getWidth() - 20, y)
  y += 5

  const fields: [string, string][] = [
    ['Nombre completo:', `${student.name} ${student.lastName}`],
    ['Matrícula:', student.matricula],
    ['Carrera:', student.major],
    ['Semestre:', `${student.semester}°`],
    ['Promedio (GPA):', student.gpa.toFixed(1)],
    ['Dependencia:', student.dependencia ?? 'No asignada'],
    ['Asesor interno:', student.internalAdvisor ?? 'No asignado'],
  ]

  doc.setFontSize(9)
  for (const [label, value] of fields) {
    doc.setFont('helvetica', 'bold')
    doc.text(label, leftCol, y)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(value, 120)
    doc.text(lines as string[], valueX, y)
    y += lines.length > 1 ? lines.length * 5 : 6
  }

  y += 4
  doc.setDrawColor(220, 220, 220)
  doc.line(leftCol, y, doc.internal.pageSize.getWidth() - 20, y)
  y += 8

  return y
}

// ─────────────────────────────────────────────────────────────────────────────
// Signature zone
// ─────────────────────────────────────────────────────────────────────────────

function buildSignatureZone(doc: jsPDF, startY: number): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  // Place signatures near bottom
  const signY = Math.max(startY + 20, pageHeight - 60)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  doc.text('Firma del alumno:', 20, signY)
  doc.line(50, signY, 100, signY)

  doc.text('Firma del responsable:', 110, signY)
  doc.line(148, signY, 190, signY)

  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Firma en tinta azul', 20, signY + 5)
  doc.setTextColor(0, 0, 0)

  doc.setFontSize(9)
  doc.text('Sello oficial:', 20, signY + 14)
  doc.line(45, signY + 14, 95, signY + 14)

  return signY + 20
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────────────

function buildFooter(doc: jsPDF, folio: string): void {
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.line(20, pageHeight - 14, pageWidth - 20, pageHeight - 14)
  doc.text(
    `Generado el ${todayFormatted()}  |  Folio: ${folio}  |  Válido únicamente con firma y sello original`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  )
  doc.setTextColor(0, 0, 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// Document-specific generators
// ─────────────────────────────────────────────────────────────────────────────

function generateCartaPresentacionSS(doc: jsPDF, student: Student, folio: string): void {
  let y = buildHeader(doc)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('CARTA DE PRESENTACIÓN', doc.internal.pageSize.getWidth() / 2, y, {
    align: 'center',
  })
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Servicio Social', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' })
  y += 10

  y = buildStudentSection(doc, student, y)

  const pageWidth = doc.internal.pageSize.getWidth()
  const bodyText =
    `Por medio de la presente, la Coordinación de Prácticas Profesionales y ` +
    `Comunicación de la Facultad de Administración de la Benemérita Universidad ` +
    `Autónoma de Puebla, presenta al(a la) alumno(a) ${student.name} ${student.lastName}, ` +
    `con matrícula ${student.matricula}, quien realizará su Servicio Social en esa ` +
    `dependencia a partir de la fecha indicada. El alumno se compromete a cumplir con ` +
    `los lineamientos establecidos por la BUAP y por la dependencia receptora, ` +
    `completando un mínimo de 480 horas de Servicio Social en el período acordado.`

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const lines = doc.splitTextToSize(bodyText, pageWidth - 40)
  doc.text(lines as string[], 20, y)
  y += (lines as string[]).length * 5.5 + 10

  buildSignatureZone(doc, y)
  buildFooter(doc, folio)
}

function generateCartaPresentacionPP(doc: jsPDF, student: Student, folio: string): void {
  let y = buildHeader(doc)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('CARTA DE PRESENTACIÓN', doc.internal.pageSize.getWidth() / 2, y, {
    align: 'center',
  })
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Práctica Profesional', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' })
  y += 10

  y = buildStudentSection(doc, student, y)

  const pageWidth = doc.internal.pageSize.getWidth()
  const bodyText =
    `Por medio de la presente, la Coordinación de Prácticas Profesionales y ` +
    `Comunicación de la Facultad de Administración de la Benemérita Universidad ` +
    `Autónoma de Puebla, presenta al(a la) alumno(a) ${student.name} ${student.lastName}, ` +
    `con matrícula ${student.matricula}, quien realizará su Práctica Profesional en esa ` +
    `empresa u organización a partir de la fecha indicada. La Práctica Profesional ` +
    `deberá ser supervisada por un asesor externo designado por la empresa y un asesor ` +
    `interno de la Facultad. El alumno se compromete a cumplir con los lineamientos ` +
    `establecidos por la BUAP y por la organización receptora.`

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const lines = doc.splitTextToSize(bodyText, pageWidth - 40)
  doc.text(lines as string[], 20, y)
  y += (lines as string[]).length * 5.5 + 10

  buildSignatureZone(doc, y)
  buildFooter(doc, folio)
}

function generateSolicitudLiberacionSS(doc: jsPDF, student: Student, folio: string): void {
  let y = buildHeader(doc)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('SOLICITUD DE LIBERACIÓN DE SERVICIO SOCIAL', doc.internal.pageSize.getWidth() / 2, y, {
    align: 'center',
  })
  y += 10

  y = buildStudentSection(doc, student, y)

  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DECLARACIÓN DEL ALUMNO', 20, y)
  y += 6

  const bodyText =
    `Por medio de la presente, yo ${student.name} ${student.lastName}, con matrícula ` +
    `${student.matricula}, alumno(a) de la ${student.major} de la Facultad de ` +
    `Administración de la BUAP, solicito formalmente la liberación de mi Servicio Social, ` +
    `habiendo completado satisfactoriamente las horas requeridas en la dependencia ` +
    `"${student.dependencia ?? 'No especificada'}".`

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const lines = doc.splitTextToSize(bodyText, pageWidth - 40)
  doc.text(lines as string[], 20, y)
  y += (lines as string[]).length * 5.5 + 8

  // Fields table
  const tableFields: [string, string][] = [
    ['Horas completadas:', '480 horas'],
    ['Fecha de inicio:', student.activeProcess?.startedAt ?? '—'],
    ['Fecha de término:', student.activeProcess?.estimatedEndDate ?? '—'],
    ['Dependencia:', student.dependencia ?? 'No especificada'],
    ['Asesor interno:', student.internalAdvisor ?? 'No asignado'],
  ]

  doc.setFontSize(9)
  for (const [label, value] of tableFields) {
    doc.setFont('helvetica', 'bold')
    doc.text(label, 20, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, 75, y)
    y += 6
  }

  y += 6
  buildSignatureZone(doc, y)
  buildFooter(doc, folio)
}

function generateGenericDocument(
  doc: jsPDF,
  student: Student,
  folio: string,
  documentName: string
): void {
  let y = buildHeader(doc)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  const pageWidth = doc.internal.pageSize.getWidth()
  const titleLines = doc.splitTextToSize(documentName.toUpperCase(), pageWidth - 40)
  doc.text(titleLines as string[], pageWidth / 2, y, { align: 'center' })
  y += (titleLines as string[]).length * 7 + 5

  y = buildStudentSection(doc, student, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const bodyText =
    `El presente documento certifica la participación de ${student.name} ${student.lastName}, ` +
    `con matrícula ${student.matricula}, en el trámite correspondiente ante la Coordinación ` +
    `de Prácticas Profesionales y Comunicación de la Facultad de Administración de la BUAP. ` +
    `Este documento forma parte del expediente oficial del alumno y debe conservarse para ` +
    `los efectos legales y administrativos que correspondan.`

  const lines = doc.splitTextToSize(bodyText, pageWidth - 40)
  doc.text(lines as string[], 20, y)
  y += (lines as string[]).length * 5.5 + 10

  buildSignatureZone(doc, y)
  buildFooter(doc, folio)
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export async function generatePDF(documentId: string, student: Student): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' })
  const folio = randomFolio()

  switch (documentId) {
    case 'DOC-SS-002':
      generateCartaPresentacionSS(doc, student, folio)
      doc.save(`carta-presentacion-ss-${student.matricula}.pdf`)
      break

    case 'DOC-PP-002':
      generateCartaPresentacionPP(doc, student, folio)
      doc.save(`carta-presentacion-pp-${student.matricula}.pdf`)
      break

    case 'DOC-SS-006':
      generateSolicitudLiberacionSS(doc, student, folio)
      doc.save(`solicitud-liberacion-ss-${student.matricula}.pdf`)
      break

    default: {
      // Determine document name from step documents
      const allStepDocs = student.activeProcess?.steps.flatMap((s) => s.documents) ?? []
      const found = allStepDocs.find((d) => d.id === documentId)
      const docName = found?.name ?? documentId
      generateGenericDocument(doc, student, folio, docName)
      doc.save(`documento-${documentId}-${student.matricula}.pdf`)
      break
    }
  }
}
