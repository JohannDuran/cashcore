"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  Wallet,
  PieChart,
  Globe,
  Sparkles,
  Users,
  Smartphone,
  Check,
  Moon,
  Sun,
  ArrowRight,
  Star,
  Twitter,
  Github,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PWAInstallButton } from "@/components/shared/pwa-install-button";

const features: { icon: React.ElementType; title: string; desc: string; pwa?: boolean }[] = [
  { icon: Wallet, title: "Múltiples wallets", desc: "Efectivo, banco, crédito y crypto. Todo en un vistazo." },
  { icon: PieChart, title: "Presupuestos inteligentes", desc: "Fija límites por categoría y nunca te pases." },
  { icon: Globe, title: "Multi-moneda", desc: "Pesos, dólares, euros. Conversión automática." },
  { icon: Sparkles, title: "AI integrada", desc: "Categorización automática y escaneo de recibos." },
  { icon: Users, title: "Finanzas compartidas", desc: "Maneja gastos en pareja, con roommates o familia." },
  { icon: Smartphone, title: "Donde quieras", desc: "Web, móvil y offline. Siempre sincronizado.", pwa: true },
];

const testimonials = [
  { name: "María García", country: "México", quote: "¡Por fin una app que entiende cómo manejo mi dinero! Super intuitiva.", avatar: "M" },
  { name: "Carlos Rodríguez", country: "Colombia", quote: "Los presupuestos por categoría me han salvado de gastar de más. 10/10.", avatar: "C" },
  { name: "Ana Martínez", country: "Argentina", quote: "La mejor app de finanzas que he usado. Simple y poderosa a la vez.", avatar: "A" },
];

const plans = [
  {
    name: "Free",
    price: { monthly: 0, annual: 0 },
    desc: "Para empezar a organizar",
    features: ["2 wallets", "1 presupuesto", "Transacciones ilimitadas", "Categorías básicas"],
    popular: false,
  },
  {
    name: "Pro",
    price: { monthly: 79, annual: 59 },
    desc: "Para control total",
    features: ["Wallets ilimitados", "Presupuestos ilimitados", "AI categorización", "Reportes avanzados", "Exportar CSV", "Multi-moneda"],
    popular: true,
  },
  {
    name: "Family",
    price: { monthly: 129, annual: 99 },
    desc: "Para toda la familia",
    features: ["Todo en Pro", "Hasta 5 miembros", "Gastos compartidos", "Split expenses", "Soporte prioritario"],
    popular: false,
  },
];

export default function LandingPage() {
  const [annual, setAnnual] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-sm"
            : "bg-transparent"
        )}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size="sm" />

          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Funciones</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Precios</a>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle size="icon-sm" />
            <Link href="/login">
              <Button variant="ghost" size="sm">Iniciar sesión</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="hidden sm:flex">Empieza gratis</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#8bc5a3]/5 via-transparent to-[#6fa8c9]/5" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#8bc5a3]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#6fa8c9]/10 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Badge className="mb-6 px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary border-primary/20">
            ✨ Nuevo: AI para categorizar gastos automáticamente
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-display tracking-tight leading-tight mb-6">
            Todas tus finanzas.{" "}
            <span className="bg-gradient-to-r from-[#6aab8e] via-[#7ab8a0] to-[#6fa8c9] bg-clip-text text-transparent">
              Una sola app.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Controla gastos, maneja presupuestos, divide cuentas y alcanza tus metas financieras.
            Todo en un solo lugar. <strong className="text-foreground">Cero excusas.</strong>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="xl" className="gap-2 shadow-lg shadow-[#6aab8e]/25 w-full sm:w-auto">
                Empieza gratis <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="xl" variant="outline" className="w-full sm:w-auto">
                Ver demo
              </Button>
            </Link>
            <PWAInstallButton variant="hero" />
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Sin tarjeta de crédito · Gratis para siempre
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border bg-muted/30 py-8">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-2xl sm:text-3xl font-bold font-display">2,000+</p>
            <p className="text-sm text-muted-foreground">Usuarios en LATAM</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold font-display">$500M+</p>
            <p className="text-sm text-muted-foreground">Transacciones rastreadas</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold font-display">4.9 ★</p>
            <p className="text-sm text-muted-foreground">Calificación promedio</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
              Todo lo que necesitas para{" "}
              <span className="text-primary">tomar el control</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Herramientas poderosas y simples para que tus finanzas dejen de ser un dolor de cabeza.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <Card key={i} className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-border/50">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold font-display text-lg mb-2">{feat.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                    {feat.pwa && (
                      <div className="mt-4">
                        <PWAInstallButton variant="feature" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/30 border-y border-border px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold font-display text-center mb-12">
            Lo que dicen nuestros usuarios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm mb-4 leading-relaxed">&quot;{t.quote}&quot;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.country}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
              Planes para cada necesidad
            </h2>
            <p className="text-muted-foreground mb-6">
              Empieza gratis, escala cuando quieras.
            </p>
            <div className="inline-flex items-center gap-3 bg-muted rounded-full p-1">
              <button
                onClick={() => setAnnual(false)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer",
                  !annual ? "bg-background shadow-sm" : "text-muted-foreground"
                )}
              >
                Mensual
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer",
                  annual ? "bg-background shadow-sm" : "text-muted-foreground"
                )}
              >
                Anual <span className="text-primary text-xs ml-1">-25%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  "relative transition-all duration-300",
                  plan.popular
                    ? "border-primary shadow-lg shadow-primary/10 scale-105"
                    : "border-border/50 hover:shadow-md"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3">Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl font-display">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.desc}</p>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  <div>
                    <span className="text-4xl font-bold font-display">
                      ${annual ? plan.price.annual : plan.price.monthly}
                    </span>
                    {plan.price.monthly > 0 && (
                      <span className="text-muted-foreground text-sm"> MXN/mes</span>
                    )}
                  </div>

                  <ul className="space-y-2 text-left">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>

                  <Link href="/register">
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.price.monthly === 0 ? "Empieza gratis" : "Comenzar prueba"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative bg-gradient-to-br from-[#8bc5a3]/10 via-[#6fa8c9]/5 to-transparent rounded-3xl p-12 border border-primary/10">
            <h2 className="text-3xl font-bold font-display mb-4">
              ¿Listo para tomar el control?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Únete a miles de personas en LATAM que ya manejan sus finanzas como profesionales.
            </p>
            <Link href="/register">
              <Button size="xl" className="shadow-lg shadow-[#6aab8e]/25 gap-2">
                Crear mi cuenta gratis <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-4">
                <Logo size="sm" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Todas tus finanzas. Una sola app. Cero excusas.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Producto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Funciones</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Precios</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button className="hover:text-foreground transition-colors cursor-pointer">Privacidad</button></li>
                <li><button className="hover:text-foreground transition-colors cursor-pointer">Términos</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Social</h4>
              <div className="flex gap-3">
                <button className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <Twitter className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <Github className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <Separator className="mb-6" />
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} CashCore. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
