import React from "react";
import { Link } from "react-router-dom";

import PublicHeader from "../../components/public/PublicHeader";

const featureTiles = [
  {
    title: "Quantum-Safe Banking",
    body: "Your savings, investments, and transactions are protected by the world's most advanced post-quantum cryptography. Experience peace of mind with every interaction.",
  },
  {
    title: "Transparent Security",
    body: "Instantly review your certificate health, device posture, and audit logs. Our dashboard puts you in control of your digital safety.",
  },
  {
    title: "Official API Access",
    body: "Connect with our secure developer APIs for fintech innovation, regulatory reporting, and seamless integration. Full documentation and support included.",
  },
];

const resourceLinks = [
  {
    label: "Digital Banking Overview",
    description:
      "Discover how PQ Banking is redefining financial security for the quantum era. Learn about our mission, technology, and commitment to transparency.",
    to: "/public#overview",
  },
  {
    label: "Security & Compliance",
    description:
      "Access official whitepapers, compliance reports, and answers to your most important security questions. Trust, verified.",
    to: "/public#security",
  },
  {
    label: "Rates & Disclosures",
    description:
      "Get the latest rates, branch directory, and consumer notices. All documents are regularly updated and officially certified.",
    to: "/public#disclosures",
  },
];

const newsItems = [
  {
    headline: "PQ Banking launches quantum-secure lending network",
    summary:
      "Our new lending corridor is anchored by hybrid certificates and zero-trust architecture, setting a new standard for digital finance.",
  },
  {
    headline: "Global CRL sync: Real-time security for all branches",
    summary:
      "Branch displays now stream revocation events in under 4 seconds, ensuring instant fraud prevention and compliance.",
  },
];

const PublicLanding = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-cyan-50 text-slate-900">
      <PublicHeader />
      <main className="flex flex-col gap-16 px-2 py-8 mx-auto max-w-7xl md:px-8 md:py-12 lg:py-16">
        <section
          id="overview"
          className="transition-all duration-700 animate-fade-in-up"
        >
          <p className="text-xs uppercase tracking-[0.6em] text-cyan-600/70 text-center md:text-left">
            Welcome to PQ Banking
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-center text-slate-900 md:text-left">
            The Official Quantum-Safe Banking Platform
          </h1>
          <p className="mt-4 text-lg text-center text-slate-600 md:text-left">
            Experience the future of finance with PQ Banking. Our platform is
            designed for transparency, security, and trust—empowering you to
            manage your money with confidence. Join thousands of customers,
            developers, and partners who rely on our certified quantum-safe
            infrastructure every day.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6 text-sm font-semibold">
            <Link
              to="/login"
              className="px-6 py-3 no-underline transition duration-200 border rounded-full shadow-sm border-cyan-200 bg-white/90 text-cyan-700 hover:text-cyan-900 hover:scale-105"
            >
              Access Secure Login
            </Link>
            <Link
              to="/register"
              className="px-6 py-3 text-white no-underline transition duration-200 rounded-full shadow-lg bg-gradient-to-r from-cyan-500 to-blue-500 shadow-cyan-500/40 hover:brightness-110 hover:scale-105"
            >
              Create Customer Profile
            </Link>
          </div>
        </section>

        <section
          id="products"
          className="grid gap-6 transition-all duration-700 md:grid-cols-3 animate-fade-in"
        >
          {featureTiles.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_15px_40px_rgba(15,23,42,0.08)]"
            >
              <h3 className="text-lg font-semibold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm text-slate-600">{feature.body}</p>
            </div>
          ))}
        </section>

        <section
          id="security"
          className="rounded-[28px] border border-white/60 bg-white/80 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] animate-fade-in-up transition-all duration-700"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.5em] text-cyan-600/70">
                Live telemetry
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">
                Real-time trust signals
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                PQ Banking publishes CRL heartbeat summaries, certificate
                lineage snapshots, and anonymized device binding metrics so
                anyone can evaluate the network before logging in.
              </p>
              <ul className="pl-5 mt-4 space-y-2 text-sm list-disc text-slate-600">
                <li>Hybrid certificate issuance latency &lt; 4s</li>
                <li>Live CRL broadcast every 90 seconds</li>
                <li>Continuous audit feed with signed hashes</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/70 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-[0_15px_30px_rgba(15,23,42,0.35)]">
              <p className="text-sm uppercase tracking-[0.4em] text-cyan-200">
                Status
              </p>
              <div className="grid gap-4 mt-4 text-sm text-left">
                <div>
                  <p className="text-slate-300">Network uptime</p>
                  <p className="text-2xl font-semibold">99.997%</p>
                </div>
                <div>
                  <p className="text-slate-300">Audit events (24h)</p>
                  <p className="text-2xl font-semibold">18,452</p>
                </div>
                <div>
                  <p className="text-slate-300">CRL refresh</p>
                  <p className="text-2xl font-semibold">Under 90s</p>
                </div>
              </div>
              <Link
                to="/public#status"
                className="inline-flex items-center justify-center px-4 py-2 mt-6 text-sm font-semibold text-white no-underline transition border rounded-full border-white/30 hover:bg-white/10"
              >
                View full transparency report
              </Link>
            </div>
          </div>
        </section>

        <section
          id="resources"
          className="grid gap-6 transition-all duration-700 md:grid-cols-3 animate-fade-in"
        >
          {resourceLinks.map((resource) => (
            <Link
              key={resource.label}
              to={resource.to}
              className="rounded-3xl border border-white/80 bg-white/85 p-5 text-slate-700 no-underline shadow-[0_12px_35px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:border-cyan-200"
            >
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-600/70">
                Public resource
              </p>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">
                {resource.label}
              </h3>
              <p className="mt-2 text-sm">{resource.description}</p>
            </Link>
          ))}
        </section>

        <section className="grid gap-6 transition-all duration-700 md:grid-cols-2 animate-fade-in-up">
          <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_15px_40px_rgba(15,23,42,0.08)]">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-600/70">
              Bank newsroom
            </p>
            <ul className="mt-4 space-y-4 text-sm text-slate-600">
              {newsItems.map((item) => (
                <li
                  key={item.headline}
                  className="p-4 border rounded-2xl border-slate-200/70 bg-white/90"
                >
                  <p className="text-base font-semibold text-slate-900">
                    {item.headline}
                  </p>
                  <p className="mt-2 text-sm">{item.summary}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-white/70 bg-gradient-to-br from-cyan-500 to-blue-500 p-6 text-white shadow-[0_20px_45px_rgba(14,116,144,0.45)]">
            <p className="text-xs uppercase tracking-[0.5em] text-white/70">
              Need help
            </p>
            <h3 className="mt-3 text-3xl font-semibold">Dedicated concierge</h3>
            <p className="mt-2 text-sm text-white/80">
              Speak with a PQ-certified banker, schedule a demo, or tour a
              hybrid branch experience.
            </p>
            <div className="mt-4 text-sm">
              <p>Call: +91 80 0000 1111</p>
              <p>Email: concierge@pqbanking.com</p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-4 py-2 mt-6 text-sm font-semibold text-white no-underline transition border rounded-full border-white/30 hover:bg-white/10"
            >
              Schedule a secure session
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PublicLanding;
