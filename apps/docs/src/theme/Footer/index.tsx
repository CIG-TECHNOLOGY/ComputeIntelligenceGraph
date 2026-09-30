import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import './styles.css';

function useLandingUrl(): string {
  const [url, setUrl] = useState('https://cig.lat');
  useEffect(() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      setUrl(`http://${host}:3001`);
    }
  }, []);
  return url;
}

export default function Footer(): JSX.Element {
  const currentYear = new Date().getFullYear();
  const {siteConfig} = useDocusaurusContext();
  const version = typeof siteConfig.customFields?.appVersion === 'string' ? siteConfig.customFields.appVersion : '';
  const landingUrl = useLandingUrl();

  const footerLinks = [
    { label: 'GitHub', href: 'https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph' },
    { label: 'Issues', href: 'https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/issues' },
    { label: 'Report', href: 'https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/issues/new' },
    { label: 'Terms', href: '/documentation/docs/en/legal/terms-of-service' },
    { label: 'Privacy', href: '/documentation/docs/en/legal/privacy-policy' },
    { label: 'Landing', href: landingUrl },
  ];

  return (
    <footer className="cig-footer">
      <div className="cig-footer-container">
        <div className="cig-footer-content">
          <div className="cig-footer-brand">
            <div className="cig-footer-logo-wrapper">
              <span className="cig-footer-logo-box">
                <svg viewBox="20 20 216 216" className="cig-footer-logo-svg" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="footerGraphGrad" x1="48" y1="40" x2="208" y2="208" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#2563EB" />
                      <stop offset="100%" stopColor="#14B8A6" />
                    </linearGradient>
                    <radialGradient id="footerCoreGlow" cx="50%" cy="50%" r="60%">
                      <stop offset="0%" stopColor="#ECFEFF" />
                      <stop offset="55%" stopColor="#A5F3FC" />
                      <stop offset="100%" stopColor="#22D3EE" />
                    </radialGradient>
                  </defs>
                  <g transform="rotate(90 128 128)">
                    <g stroke="url(#footerGraphGrad)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
                      <line x1="128" y1="52" x2="74" y2="174" />
                      <line x1="128" y1="52" x2="182" y2="174" />
                      <line x1="74" y1="174" x2="128" y2="146" />
                      <line x1="128" y1="146" x2="182" y2="174" />
                      <line x1="74" y1="174" x2="182" y2="174" />
                    </g>
                    <g fill="white" stroke="url(#footerGraphGrad)" strokeWidth="6">
                      <circle cx="128" cy="52" r="14" />
                      <circle cx="74" cy="174" r="14" />
                      <circle cx="182" cy="174" r="14" />
                      <circle cx="128" cy="146" r="18" />
                    </g>
                    <circle cx="128" cy="146" r="9" fill="url(#footerCoreGlow)" />
                  </g>
                </svg>
              </span>
              <div className="cig-footer-brand-text">
                <span className="cig-footer-brand-label">CIG</span>
              </div>
            </div>

            <div className="cig-footer-links">
              {footerLinks.map((link) => (
                link.href.startsWith('http') ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cig-footer-link"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.href} to={link.href} className="cig-footer-link">
                    {link.label}
                  </Link>
                )
              ))}
            </div>
          </div>

          <div className="cig-footer-meta">
            <div>© {currentYear} CIG Project · Open Source · MIT License {version && `· v${version}`}</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
