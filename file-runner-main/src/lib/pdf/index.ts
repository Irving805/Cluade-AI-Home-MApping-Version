/**
 * PDF Module — SSOT-Compliant PDF Generation
 * 
 * This module provides the new SSOT-compliant PDF generator that consumes
 * the BookingSummary object instead of recalculating values.
 * 
 * EXPORTS:
 * - generateSsotPdf: Core PDF generation function
 * - generateSsotPdfBlob: Returns Blob for download/upload
 * - downloadSsotPdf: Downloads the PDF to user's device
 * - SsotPdfParams: Interface for PDF parameters
 * - validatePdfParity: Dev-only parity validation
 */

export {
  generateSsotPdf,
  generateSsotPdfBlob,
  downloadSsotPdf,
  type SsotPdfParams,
} from './pdfSsotGenerator';

export {
  validatePdfParity,
  logParityReport,
  assertPdfParity,
  type ParityReport,
  type ParityMismatch,
} from './pdfParityValidator';
