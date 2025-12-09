import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { ThresholdMethod } from './lactateCalculations'

interface Customer {
  customer_id: string
  name: string
  email?: string
  phone?: string
  date_of_birth?: string
  height_cm?: number
  weight_kg?: number
  notes?: string
}

interface WebhookData {
  power?: number
  load?: number
  lactate?: number
  heartRate?: number
  duration?: number
}

interface TrainingZone {
  id: number
  name: string
  range: [number, number]
  description?: string
  color: string
}

interface ThresholdPoint {
  power: number
  lactate: number
}

interface PDFExportOptions {
  chartRef: React.RefObject<HTMLDivElement | null>
  selectedCustomer: Customer | null
  selectedMethod: string
  currentUnit: string
  webhookData: WebhookData[]
  trainingZones: TrainingZone[]
  lt1: ThresholdPoint | number | null
  lt2: ThresholdPoint | number | null
  getMethodDisplayName: (method: ThresholdMethod) => string
}

function trimCanvasWhitespace(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  const isRowEmpty = (y: number): boolean => {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const alpha = data[idx + 3]
      if (alpha !== 0) {
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        if (r < 252 || g < 252 || b < 252) {
          return false
        }
      }
    }
    return true
  }

  let top = 0
  while (top < height && isRowEmpty(top)) {
    top += 1
  }

  let bottom = height - 1
  while (bottom > top && isRowEmpty(bottom)) {
    bottom -= 1
  }

  const trimmedHeight = bottom - top + 1
  if (trimmedHeight <= 0 || trimmedHeight === height) {
    return canvas
  }

  const trimmedCanvas = document.createElement('canvas') as HTMLCanvasElement
  trimmedCanvas.width = width
  trimmedCanvas.height = trimmedHeight

  const trimmedCtx = trimmedCanvas.getContext('2d')
  if (!trimmedCtx) {
    return canvas
  }

  const trimmedData = ctx.getImageData(0, top, width, trimmedHeight)
  trimmedCtx.putImageData(trimmedData, 0, 0)
  return trimmedCanvas
}

export async function exportLactateAnalysisToPDF(options: PDFExportOptions): Promise<void> {
  const {
    chartRef,
    selectedCustomer,
    selectedMethod,
    currentUnit,
    webhookData,
    trainingZones,
    lt1,
    lt2,
    getMethodDisplayName
  } = options

  if (!chartRef.current) {
    throw new Error('Chart reference is not available')
  }

  try {
    const capturedCanvas = await html2canvas(chartRef.current, {
      scale: 2,
      backgroundColor: '#ffffff'
    })
    const canvas = trimCanvasWhitespace(capturedCanvas)
    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF('landscape', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const horizontalMargin = 15
    const topMargin = 15
    const bottomMargin = 20
    const contentWidth = pageWidth - horizontalMargin * 2

    // Title
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Laktat-Performance-Analyse', pageWidth / 2, topMargin, { align: 'center' })

    // Customer Information
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    let yPos = topMargin + 10

    if (selectedCustomer) {
      pdf.text(`Kunde: ${selectedCustomer.name}`, horizontalMargin, yPos)
      yPos += 5

      if (selectedCustomer.date_of_birth) {
        pdf.text(
          `Geburtsdatum: ${new Date(selectedCustomer.date_of_birth).toLocaleDateString('de-DE')}`,
          horizontalMargin,
          yPos
        )
        yPos += 5
      }

      if (selectedCustomer.height_cm || selectedCustomer.weight_kg) {
        const info: string[] = []
        if (selectedCustomer.height_cm) info.push(`Größe: ${selectedCustomer.height_cm} cm`)
        if (selectedCustomer.weight_kg) info.push(`Gewicht: ${selectedCustomer.weight_kg} kg`)
        pdf.text(info.join(' | '), horizontalMargin, yPos)
        yPos += 5
      }
    }

    pdf.text(`Methode: ${getMethodDisplayName(selectedMethod as ThresholdMethod)}`, horizontalMargin, yPos)
    yPos += 5
    pdf.text(
      `Einheit: ${
        currentUnit === 'watt'
          ? 'Power (W)'
          : currentUnit === 'kmh'
          ? 'Speed (km/h)'
          : currentUnit
      }`,
      horizontalMargin,
      yPos
    )
    yPos += 5
    pdf.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, horizontalMargin, yPos)
    yPos += 8

    // Measurement Data Table
    if (webhookData && webhookData.length > 0) {
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Messdaten', horizontalMargin, yPos)
      yPos += 6

      pdf.setFontSize(9)
      const headers = ['Stufe', 'Load', 'Laktat', 'HF', 'Dauer']
      const tableWidth = contentWidth
      const colWidth = tableWidth / headers.length

      pdf.setFillColor(200, 200, 200)
      pdf.rect(horizontalMargin, yPos - 4, tableWidth, 6, 'F')

      pdf.setFont('helvetica', 'bold')
      headers.forEach((header, i) => {
        pdf.text(header, horizontalMargin + i * colWidth + 2, yPos)
      })
      yPos += 6

      pdf.setFont('helvetica', 'normal')
      webhookData.forEach((data, index) => {
        const loadValue = data.power || data.load || '-'
        const lactateValue = data.lactate ? data.lactate.toFixed(2) : '-'
        const hrValue = data.heartRate || '-'
        const durationValue =
          data.duration !== null && data.duration !== undefined
            ? Number(data.duration).toFixed(1)
            : '-'

        if (index % 2 === 0) {
          pdf.setFillColor(240, 240, 240)
          pdf.rect(horizontalMargin, yPos - 4, tableWidth, 5, 'F')
        }

        pdf.text(`${index + 1}`, horizontalMargin + 2, yPos)
        pdf.text(`${loadValue}`, horizontalMargin + colWidth + 2, yPos)
        pdf.text(`${lactateValue}`, horizontalMargin + colWidth * 2 + 2, yPos)
        pdf.text(`${hrValue}`, horizontalMargin + colWidth * 3 + 2, yPos)
        pdf.text(`${durationValue}`, horizontalMargin + colWidth * 4 + 2, yPos)

        yPos += 5
      })

      yPos += 6
    }

    const chartWidth = contentWidth
    const rawChartHeight = (canvas.height * chartWidth) / canvas.width
    const maxChartHeight = pageHeight - topMargin - bottomMargin

    if (yPos + rawChartHeight > pageHeight - bottomMargin) {
      pdf.addPage()
      yPos = topMargin
    }

    let chartHeight = rawChartHeight
    let chartRenderWidth = chartWidth
    let chartX = horizontalMargin

    if (chartHeight > maxChartHeight) {
      const scale = maxChartHeight / chartHeight
      chartHeight = maxChartHeight
      chartRenderWidth = chartWidth * scale
      chartX = (pageWidth - chartRenderWidth) / 2
    }

    pdf.addImage(imgData, 'PNG', chartX, yPos, chartRenderWidth, chartHeight)
    yPos += chartHeight + 8

    if (yPos > pageHeight - bottomMargin) {
      pdf.addPage()
      yPos = topMargin
    }

    if (trainingZones && trainingZones.length > 0) {
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Trainingszonen', horizontalMargin, yPos)
      yPos += 6

      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')

      trainingZones.forEach((zone) => {
        if (yPos > pageHeight - bottomMargin) {
          pdf.addPage()
          yPos = topMargin
        }

        const zoneText = `Zone ${zone.id}: ${zone.name} - ${zone.range[0].toFixed(0)} - ${zone.range[1].toFixed(0)} ${
          currentUnit === 'watt' ? 'W' : 'km/h'
        }`
        const description = `${zone.description || ''}`

        pdf.setFont('helvetica', 'bold')
        pdf.text(zoneText, horizontalMargin, yPos)
        yPos += 5

        if (description) {
          pdf.setFont('helvetica', 'normal')
          const descriptionLines = description.split('\n')
          descriptionLines.forEach((line) => {
            const wrappedLines = pdf.splitTextToSize(line, contentWidth)
            wrappedLines.forEach((wrappedLine: string) => {
              pdf.text(wrappedLine, horizontalMargin, yPos)
              yPos += 4
            })
          })
        }

        yPos += 4
      })
    }

    if (lt1 || lt2) {
      if (yPos > pageHeight - bottomMargin) {
        pdf.addPage()
        yPos = topMargin
      }

      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Schwellenwerte', horizontalMargin, yPos)
      yPos += 6

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')

      if (lt1) {
        const lt1Value = typeof lt1 === 'number' ? lt1 : lt1.power
        pdf.text(
          `LT1 (Aerobe Schwelle): ${lt1Value.toFixed(1)} ${currentUnit === 'watt' ? 'W' : 'km/h'}`,
          horizontalMargin,
          yPos
        )
        yPos += 5
      }

      if (lt2) {
        const lt2Value = typeof lt2 === 'number' ? lt2 : lt2.power
        pdf.text(
          `LT2 (Anaerobe Schwelle): ${lt2Value.toFixed(1)} ${currentUnit === 'watt' ? 'W' : 'km/h'}`,
          horizontalMargin,
          yPos
        )
        yPos += 5
      }
    }

    pdf.save(`lactate-analysis-${selectedCustomer?.name || 'unknown'}-${new Date().toISOString().split('T')[0]}.pdf`)
  } catch (error) {
    console.error('Error exporting PDF:', error)
    throw error
  }
}
