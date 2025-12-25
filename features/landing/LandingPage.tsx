
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BrainCircuit, Palette, Zap, ArrowRight, Layout, Download, Share2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-cosmic-950 text-white overflow-hidden relative selection:bg-indigo-500/30">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '7s' }} />
            </div>

            {/* Navbar */}
            <nav className="relative z-10 border-b border-white/5 bg-cosmic-950/50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-500 p-2 rounded-lg">
                            <BrainCircuit className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            SopaCreator Studio
                        </span>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/editor')}
                            className="bg-white/5 hover:bg-white/10 text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-white/5"
                        >
                            Acceso Directo
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
                <div className="flex flex-col lg:flex-row items-center gap-12">
                    <div className="flex-1 space-y-8 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Sparkles className="w-3 h-3" /> Suite de Producción Editorial
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight tracking-tight">
                            Tu Fábrica de <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-purple-400">
                                Pasatiempos Pro
                            </span>
                        </h1>

                        <p className="text-lg text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            Sistema interno para la generación masiva de sopas de letras de alta calidad.
                            Optimizado para impresión editorial y ventas directas. Sin intermediarios.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
                            <button
                                onClick={() => navigate('/editor')}
                                className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl font-bold text-lg shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all hover:scale-105 active:scale-95"
                            >
                                <span className="flex items-center gap-2">
                                    Iniciar Producción <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </button>
                            {/* <button className="px-8 py-4 bg-cosmic-800 border border-white/10 rounded-xl font-bold text-lg hover:bg-cosmic-700 transition-all">
                                Ver Ejemplos
                            </button> */}
                        </div>

                        <div className="pt-8 flex items-center justify-center lg:justify-start gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                            <span className="text-sm font-mono text-slate-500">Licencia de Uso: Interna / Comercial</span>
                        </div>
                    </div>

                    {/* Visual Preview / Floating Cards */}
                    <div className="flex-1 relative w-full max-w-lg lg:max-w-xl perspective-1000">
                        <div className="relative z-10 bg-cosmic-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl transform rotate-y-[-10deg] rotate-x-[5deg] hover:rotate-0 transition-transform duration-700">
                            {/* Mockup of UI */}
                            <div className="w-full aspect-[4/3] bg-cosmic-950 rounded-lg overflow-hidden relative border border-white/5">
                                <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 gap-px opacity-20">
                                    {Array.from({ length: 100 }).map((_, i) => (
                                        <div key={i} className="bg-slate-700/50"></div>
                                    ))}
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center space-y-2">
                                        <div className="inline-block p-4 bg-indigo-500/20 rounded-full animate-pulse">
                                            <Wand2Icon className="w-12 h-12 text-indigo-400" />
                                        </div>
                                        <div className="text-sm text-indigo-300 font-mono">Generando Matriz...</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Badge */}
                        <div className="absolute -bottom-8 -left-8 bg-cosmic-800 border border-glass-border p-4 rounded-xl shadow-xl flex items-center gap-3 animate-bounce" style={{ animationDuration: '3s' }}>
                            <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 uppercase font-bold">Velocidad</div>
                                <div className="font-bold text-white">Generación &lt; 2s</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Features Grid */}
            <section className="bg-cosmic-900/50 border-t border-white/5 py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Todo lo que necesitas</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            Desde proyectos escolares hasta publicaciones editoriales.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={Palette}
                            title="Diseño Ilimitado"
                            desc="Colores personalizados, fuentes modernas y temas visuales que se adaptan a tu marca."
                        />
                        <FeatureCard
                            icon={Layout}
                            title="Formatos Flexibles"
                            desc="Exporta en PDF vectorial de alta calidad, PNG para web o JSON para integrar en apps."
                        />
                        <FeatureCard
                            icon={Share2}
                            title="Modo Híbrido"
                            desc="Combina la lógica de Python con la creatividad de la IA Generativa (Gemini/DeepSeek)."
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};

const FeatureCard = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
        <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Icon className="w-6 h-6 text-indigo-400" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
        <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
    </div>
);

const Wand2Icon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m19 2 2 2-2 2-2-2 2-2Z" /><path d="m5 17 2 2-2 2-2-2 2-2Z" /><path d="m15 4-1 1" /><path d="M6 10l.7.7" /><path d="M12 2l.6.6" /><path d="m18.4 12.7-9.9 9.9c-.4.4-1 .4-1.4 0l-1.4-1.4c-.4-.4-.4-1 0-1.4l9.9-9.9c1.2-1.2 3.2-1.2 4.4 0l1.4 1.4c1.2 1.2 1.2 3.2 0 4.4Z" /></svg>
)

export default LandingPage;
