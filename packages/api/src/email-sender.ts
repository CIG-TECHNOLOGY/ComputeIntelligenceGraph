import nodemailer from 'nodemailer';

// ─── Localised copy ───────────────────────────────────────────────────────────

interface LocaleCopy {
  subject: string;
  headline: string;
  subheadline: string;
  intro: string;
  featuresTitle: string;
  features: { color: string; title: string; desc: string }[];
  ctaLabel: string;
  resourcesTitle: string;
  docsCta: string;
  githubCta: string;
  footerNote: string;
  unsubscribeLabel: string;
  copyright: string;
}

const COPY: Record<string, LocaleCopy> = {
  en: {
    subject: 'Welcome to CIG — Your Infrastructure Intelligence Platform',
    headline: 'Welcome to the<br>Intelligence Graph',
    subheadline: "You're on the early-access list. Here's what CIG can do for you.",
    intro:
      'CIG automatically discovers your infrastructure — cloud, on-premise, or local — builds a living dependency graph, and lets you query everything through a conversational AI interface.',
    featuresTitle: 'WHAT YOU CAN DO',
    features: [
      {
        color: '#06b6d4',
        title: 'Infrastructure Graph',
        desc: 'Visualize all your resources as an interactive dependency graph across cloud, on-prem, and containers.',
      },
      {
        color: '#8b5cf6',
        title: 'Universal Discovery',
        desc: 'Auto-discover AWS, GCP, Azure, Kubernetes, and bare-metal in minutes — no agents, no config.',
      },
      {
        color: '#f59e0b',
        title: 'Cost Analysis',
        desc: 'Track spending across all providers and surface savings opportunities in real time.',
      },
      {
        color: '#10b981',
        title: 'Security Insights',
        desc: 'Detect misconfigurations, over-permissive IAM, and exposed resources automatically.',
      },
      {
        color: '#3b82f6',
        title: 'AI Console',
        desc: 'Query your infrastructure in plain English — powered by your choice of LLM.',
      },
    ],
    ctaLabel: 'Enter Dashboard',
    resourcesTitle: 'EXPLORE MORE',
    docsCta: 'Read the Docs',
    githubCta: 'View on GitHub',
    footerNote: 'You received this email because you subscribed at cig.lat.',
    unsubscribeLabel: 'Unsubscribe',
    copyright: '© {year} Compute Intelligence Graph · Open-source under MIT License',
  },
  es: {
    subject: 'Bienvenido a CIG — Tu Plataforma de Inteligencia de Infraestructura',
    headline: 'Bienvenido al<br>Grafo de Inteligencia',
    subheadline: 'Estás en la lista de acceso anticipado. Esto es lo que CIG puede hacer por ti.',
    intro:
      'CIG descubre automáticamente tu infraestructura — cloud, on-premise o local — construye un grafo de dependencias vivo y te permite consultar todo a través de una interfaz de IA conversacional.',
    featuresTitle: 'LO QUE PUEDES HACER',
    features: [
      {
        color: '#06b6d4',
        title: 'Grafo de Infraestructura',
        desc: 'Visualiza todos tus recursos como un grafo de dependencias interactivo: cloud, on-prem y contenedores.',
      },
      {
        color: '#8b5cf6',
        title: 'Descubrimiento Universal',
        desc: 'Auto-descubre AWS, GCP, Azure, Kubernetes y bare-metal en minutos — sin agentes, sin configuración.',
      },
      {
        color: '#f59e0b',
        title: 'Análisis de Costos',
        desc: 'Rastrea el gasto en todos los proveedores e identifica oportunidades de ahorro en tiempo real.',
      },
      {
        color: '#10b981',
        title: 'Información de Seguridad',
        desc: 'Detecta configuraciones incorrectas, IAM con exceso de permisos y recursos expuestos automáticamente.',
      },
      {
        color: '#3b82f6',
        title: 'Consola de IA',
        desc: 'Consulta tu infraestructura en lenguaje natural — con el LLM de tu elección.',
      },
    ],
    ctaLabel: 'Entrar al Dashboard',
    resourcesTitle: 'EXPLORAR MÁS',
    docsCta: 'Leer la documentación',
    githubCta: 'Ver en GitHub',
    footerNote: 'Recibiste este correo porque te suscribiste en cig.lat.',
    unsubscribeLabel: 'Cancelar suscripción',
    copyright: '© {year} Compute Intelligence Graph · Código abierto bajo licencia MIT',
  },
};

function getCopy(locale: string): LocaleCopy {
  return COPY[locale] ?? COPY['en']!;
}

// ─── Template builder ─────────────────────────────────────────────────────────

function featureRow(feature: { color: string; title: string; desc: string }): string {
  return `
    <tr>
      <td style="padding:0 0 12px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td width="36" valign="top" style="padding-top:2px;">
              <div style="width:28px;height:28px;background-color:${feature.color}1a;border-radius:8px;text-align:center;line-height:28px;">
                <span style="font-size:14px;color:${feature.color};">&#9670;</span>
              </div>
            </td>
            <td style="padding-left:12px;">
              <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#111827;">${feature.title}</p>
              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.55;">${feature.desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

interface BuildHtmlOptions {
  copy: LocaleCopy;
  unsubscribeUrl: string;
  dashboardUrl: string;
  docsUrl: string;
  githubUrl: string;
  year: number;
}

function buildHtml(opts: BuildHtmlOptions): string {
  const { copy, unsubscribeUrl, dashboardUrl, docsUrl, githubUrl, year } = opts;
  const copyright = copy.copyright.replace('{year}', String(year));

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
  <title>${copy.subject}</title>
  <style>
    body { margin:0; padding:0; background-color:#f1f5f9; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    a { text-decoration:none; }
    @media only screen and (max-width:620px) {
      .email-container { width:100% !important; }
      .stack-column { display:block !important; width:100% !important; }
      .mobile-pad { padding-left:24px !important; padding-right:24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f1f5f9;">${copy.subheadline}&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;</div>

  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">

        <!-- Email container -->
        <table role="presentation" class="email-container" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background-color:#0c1322;border-radius:16px 16px 0 0;padding:0;">
              <!-- Gradient top bar -->
              <div style="height:4px;background:linear-gradient(90deg,#06b6d4,#3b82f6,#8b5cf6);border-radius:16px 16px 0 0;"></div>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td class="mobile-pad" style="padding:36px 48px 32px;">
                    <!-- Brand mark -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td>
                          <div style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#3b82f6,#8b5cf6);border-radius:10px;width:36px;height:36px;text-align:center;line-height:36px;vertical-align:middle;">
                            <span style="font-size:18px;font-weight:900;color:#ffffff;font-family:Arial,sans-serif;">&#11042;</span>
                          </div>
                          <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">CIG</span>
                        </td>
                      </tr>
                    </table>
                    <!-- Headline -->
                    <h1 style="margin:24px 0 12px;font-size:30px;font-weight:800;line-height:1.2;color:#ffffff;letter-spacing:-0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${copy.headline}</h1>
                    <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.72);line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${copy.subheadline}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="background-color:#ffffff;padding:0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td class="mobile-pad" style="padding:36px 48px 32px;">

                    <!-- Intro text -->
                    <p style="margin:0 0 32px;font-size:15px;color:#374151;line-height:1.75;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${copy.intro}</p>

                    <!-- Divider -->
                    <div style="height:1px;background-color:#f3f4f6;margin:0 0 24px;"></div>

                    <!-- Features label -->
                    <p style="margin:0 0 20px;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:0.1em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${copy.featuresTitle}</p>

                    <!-- Features list -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      ${copy.features.map(featureRow).join('')}
                    </table>

                    <!-- Divider -->
                    <div style="height:1px;background-color:#f3f4f6;margin:32px 0 28px;"></div>

                    <!-- CTA button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="border-radius:50px;background:linear-gradient(135deg,#06b6d4,#3b82f6,#8b5cf6);mso-padding-alt:0;">
                          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${dashboardUrl}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="50%" stroke="f" fillcolor="#3b82f6"><w:anchorlock/><center><![endif]-->
                          <a href="${dashboardUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;border-radius:50px;">${copy.ctaLabel} &rarr;</a>
                          <!--[if mso]></center></v:roundrect><![endif]-->
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── RESOURCES BAND ── -->
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e5e7eb;padding:0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td class="mobile-pad" style="padding:24px 48px;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:0.1em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${copy.resourcesTitle}</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-right:16px;">
                          <a href="${docsUrl}" style="display:inline-block;padding:8px 18px;font-size:13px;font-weight:600;color:#374151;background-color:#ffffff;border:1px solid #d1d5db;border-radius:8px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${copy.docsCta}</a>
                        </td>
                        <td>
                          <a href="${githubUrl}" style="display:inline-block;padding:8px 18px;font-size:13px;font-weight:600;color:#374151;background-color:#ffffff;border:1px solid #d1d5db;border-radius:8px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${copy.githubCta}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background-color:#f1f5f9;border-top:1px solid #e5e7eb;border-radius:0 0 16px 16px;padding:0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td class="mobile-pad" style="padding:24px 48px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${copyright}</p>
                    <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      ${copy.footerNote}
                      &nbsp;&middot;&nbsp;
                      <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${copy.unsubscribeLabel}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface SendWelcomeEmailOptions {
  to: string;
  locale: string;
  unsubscribeToken: string;
}

export async function sendWelcomeNewsletter(opts: SendWelcomeEmailOptions): Promise<void> {
  const transport = buildTransport();
  if (!transport) {
    // No SMTP configured — skip silently (log in caller)
    return;
  }

  const copy = getCopy(opts.locale);
  const siteUrl = process.env.SITE_URL ?? 'https://cig.lat';
  const dashboardUrl = process.env.DASHBOARD_URL ?? 'https://app.cig.lat';
  const docsUrl = process.env.DOCS_URL ?? 'https://cig.lat/documentation';
  const githubUrl = 'https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph';
  const unsubscribeUrl = `${siteUrl}/unsubscribe?token=${opts.unsubscribeToken}`;

  const html = buildHtml({
    copy,
    unsubscribeUrl,
    dashboardUrl,
    docsUrl,
    githubUrl,
    year: new Date().getFullYear(),
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? '"CIG" <no-reply@cig.technology>',
    to: opts.to,
    subject: copy.subject,
    html,
  });
}

// ─── Transport factory ────────────────────────────────────────────────────────

function buildTransport(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}
