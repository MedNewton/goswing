// src/lib/qr/ticketQr.ts
export type TicketQrInput = Readonly<{
    reservationId: string;
    ticketId: string;
    ticketNo: number;
    ticketCode?: string | null;
  }>;
  
  export type TicketQrOutput = Readonly<{
    qrValue: string;      // what you encode in QR
    qrCaption: string;    // what you display under QR
  }>;
  
  function safeTrim(v: unknown): string {
    return typeof v === 'string' ? v.trim() : '';
  }
  
  /**
   * QR contract (stable):
   * - Prefer DB ticket_code (recommended)
   * - Else fallback derived deterministically from reservation + ticket
   */
  export function buildTicketQr(input: TicketQrInput): TicketQrOutput {
    const ticketCode = safeTrim(input.ticketCode);
  
    if (ticketCode) {
      // Versioned, so you can evolve the format later without breaking scanners
      return {
        qrValue: `gs:v1:${ticketCode}`,
        qrCaption: ticketCode,
      };
    }
  
    // Deterministic fallback (no randomness, always the same)
    return {
      qrValue: `gs:v1:res:${input.reservationId}:t:${input.ticketNo}:id:${input.ticketId}`,
      qrCaption: `#${input.ticketNo}`,
    };
  }
  