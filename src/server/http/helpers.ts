import { Request, Response } from 'express';

/** Parst eine positive ganzzahlige ID aus einem Pfadparameter; `null` bei ungültigem Wert. */
export function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

type Handler = (req: Request, res: Response) => void;

/**
 * Kapselt einen Route-Handler: unerwartete Fehler werden geloggt und als
 * `500 { error: errorMessage }` beantwortet.
 */
export function route(errorMessage: string, handler: Handler): Handler {
  return (req, res) => {
    try {
      handler(req, res);
    } catch (error) {
      console.error(`${errorMessage}`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: errorMessage });
      }
    }
  };
}

/** Variante von `route`, die die ID aus `:id` parst und bei Fehler mit 400 antwortet. */
export function routeWithId(
  errorMessage: string,
  handler: (req: Request, res: Response, id: number) => void
): Handler {
  return route(errorMessage, (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: 'Ungültige ID.' });
      return;
    }
    handler(req, res, id);
  });
}
