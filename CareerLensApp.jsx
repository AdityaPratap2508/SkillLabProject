import { useEffect, useState } from 'react';
import {
  Activity, ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, BarChart3,
  BookOpen, BriefcaseBusiness, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleHelp, CloudUpload, Compass, Download, FileText, GraduationCap, History,
  Lightbulb, LoaderCircle, LockKeyhole, Menu, NotebookPen, Plus, Search,
  ShieldCheck, Sparkles, Target, Trash2, UserRound, X
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, Radar,
  RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import './careerlens.css';

const sampleResume = `JAMIE RIVERA\nBengaluru, India | jamie.rivera@example.com | linkedin.com/in/jamierivera | github.com/jamierivera\n\nSUMMARY\nComputer Science student interested in building accessible web products and learning from collaborative engineering teams.\n\nEDUCATION\nBachelor of Technology in Computer Science, North Valley University | Expected May 2027\nRelevant coursework: Data Structures, Database Systems, Human-Computer Interaction\n\nPROJECTS\nCampus Resource Finder — React, JavaScript, CSS, REST APIs\nBuilt a responsive web application that helps students find campus services. Worked with two classmates to design the search flow and connect a public campus data API.\n\nStudy Group Planner — Node.js, PostgreSQL, Git\nDeveloped a small scheduling API for student study groups and added input validation for event creation.\n\nEXPERIENCE\nWeb Development Intern, BrightPath Studio | May 2025 - Aug 2025\nImplemented accessible form components and collaborated with a designer to improve the mobile onboarding experience.\n\nSKILLS\nJavaScript, React, HTML, CSS, Node.js, PostgreSQL, REST APIs, Git, Figma, communication, teamwork\n\nCERTIFICATIONS\nIntroduction to Web Accessibility — Open Learning Lab, 2025`;

const featureData = [
  [FileText, 'Resume summary', 'See your education, experience, projects, and strongest qualifications in one clear view.'],
  [BarChart3, 'Skills evidence', 'Review skills found in your resume, with excerpts and confidence labels.'],
  [BriefcaseBusiness, 'Role recommendations', 'Explore early-career directions matched to your current resume evidence.'],
  [Target, 'Skill gaps', 'Compare your current evidence with role-specific requirements and priorities.'],
  [BookOpen, 'Learning roadmap', 'Turn important gaps into practical learning tasks and portfolio projects.'],
  [NotebookPen, 'Resume improvements', 'Get concrete, truthful edits that never invent achievements or credentials.']
];

const resultTabs = [
  ['Overview', Activity], ['Resume Summary', FileText], ['Skills Analysis', BarChart3],
  ['Job Recommendations', BriefcaseBusiness], ['Missing Skills', Target],
  ['Learning Roadmap', BookOpen], ['Resume Improvements', NotebookPen],
  ['Job Description Match', Search]
];

async function api(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...options, headers });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || 'The request could not be completed.');
  return data;
}

function CareerLensApp() {
  const [token, setToken] = useState(() => localStorage.getItem('careerlens_token') || '');
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('careerlens_user') || 'null'); } catch { return null; } });
  const [storageMode, setStorageMode] = useState(() => localStorage.getItem('careerlens_storage_mode') || '');
  const [screen, setScreen] = useState('home');
  const [authMode, setAuthMode] = useState('login');
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState(null);
  const [record, setRecord] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [targetRole, setTargetRole] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [consentToAi, setConsentToAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobMatch, setJobMatch] = useState(null);
  const [matching, setMatching] = useState(false);
  const [taskStatuses, setTaskStatuses] = useState({});
  const analysis = record?.result;

  useEffect(() => {
    if (!token || !user) return;
    Promise.all([api('/api/analyses', { token }), api('/api/profile', { token })])
      .then(([saved, account]) => { setHistory(saved.analyses || []); setProfile(account.profile || {}); setStorageMode(account.storageMode || 'demo'); })
      .catch(() => setHistory([]));
  }, [token, user]);

  function openAnalyzer() { setError(''); setNotice(''); setScreen('analyzer'); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  async function handleFile(file) {
    if (!file) return;
    setError('');
    const validMime = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'];
    if (!/\.(pdf|docx)$/i.test(file.name) || !validMime.includes(file.type)) return setError('Choose a PDF or DOCX resume.');
    if (file.size > 5 * 1024 * 1024) return setError('Resume must be smaller than 5 MB.');
    const form = new FormData();
    form.append('resume', file);
    setFileName(file.name);
    setUploadStatus('Extracting document text…');
    try {
      const extracted = await api('/api/resumes/upload', { method: 'POST', body: form, token });
      setResumeText(extracted.text);
      setUploadStatus('Text extracted. Review and edit before analysis.');
    } catch (reason) { setUploadStatus(''); setError(reason.message); }
  }

  async function analyze() {
    setError(''); setNotice(''); setLoading(true);
    try {
      const data = await api('/api/analyses/analyze', { method: 'POST', token, body: JSON.stringify({ resumeText, filename: fileName || 'Pasted resume text', consentToAi, targetRole }) });
      setRecord(data.analysis);
      setTab('Overview');
      setTargetRole(data.analysis.result.jobRecommendations[0]?.title || '');
      setJobMatch(null);
      setScreen('results');
      setNotice(data.retention);
      if (user && data.analysis.saved) setHistory((await api('/api/analyses', { token })).analyses || []);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  }

  async function submitAuth(event) {
    event.preventDefault(); setError('');
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const result = await api(`/api/auth/${authMode === 'register' ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(payload) });
      setToken(result.token); setUser(result.user); setStorageMode(result.storageMode || 'demo');
      localStorage.setItem('careerlens_token', result.token);
      localStorage.setItem('careerlens_user', JSON.stringify(result.user));
      localStorage.setItem('careerlens_storage_mode', result.storageMode || 'demo');
      setAuthOpen(false);
      setNotice(result.storageMode === 'demo' ? 'Demo account: account data is temporary.' : 'Your CareerLens account is ready.');
    } catch (reason) { setError(reason.message); }
  }

  async function signOut() {
    try { if (token) await api('/api/auth/logout', { method: 'POST', token }); } catch { /* Clear local session even if offline. */ }
    ['careerlens_token', 'careerlens_user', 'careerlens_storage_mode'].forEach((key) => localStorage.removeItem(key));
    setToken(''); setUser(null); setStorageMode(''); setHistory([]); setProfile(null); setScreen('home');
  }

  async function saveProfile(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const year = data.get('graduationYear');
    try {
      const result = await api('/api/profile', { method: 'PUT', token, body: JSON.stringify({
        college: data.get('college'), degree: data.get('degree'), department: data.get('department'),
        graduationYear: year ? Number(year) : null,
        preferredRoles: String(data.get('preferredRoles') || '').split(',').map((item) => item.trim()).filter(Boolean),
        preferredLocation: data.get('preferredLocation'), experienceLevel: data.get('experienceLevel')
      }) });
      setProfile(result.profile); setStorageMode(result.storageMode || storageMode); setNotice('Profile saved.');
    } catch (reason) { setError(reason.message); }
  }

  async function openSaved(item) {
    try {
      const result = await api(`/api/analyses/${item.id}`, { token });
      setRecord(result.analysis); setTargetRole(result.analysis.result.jobRecommendations[0]?.title || ''); setTab('Overview'); setScreen('results');
    } catch (reason) { setError(reason.message); }
  }

  async function deleteSaved(id) {
    try {
      await api(`/api/analyses/${id}`, { method: 'DELETE', token });
      setHistory((items) => items.filter((item) => item.id !== id));
      if (record?.id === id) { setRecord(null); setScreen('history'); }
    } catch (reason) { setError(reason.message); }
  }

  async function matchJob(event) {
    event.preventDefault(); setMatching(true); setError('');
    try {
      const result = await api('/api/job-matches/analyze', { method: 'POST', token, body: JSON.stringify({ resumeText, jobDescription }) });
      setJobMatch(result.match);
    } catch (reason) { setError(reason.message); }
    finally { setMatching(false); }
  }

  function cycleTask(id) {
    const order = ['Not Started', 'In Progress', 'Completed'];
    setTaskStatuses((current) => ({ ...current, [id]: order[(order.indexOf(current[id] || order[0]) + 1) % order.length] }));
  }

  return <div className="site-shell">
    <Header user={user} screen={screen} menuOpen={menuOpen} setMenuOpen={setMenuOpen} navigate={setScreen} login={() => { setAuthMode('login'); setAuthOpen(true); setError(''); }} register={() => { setAuthMode('register'); setAuthOpen(true); setError(''); }} signOut={signOut} />
    {error && <Message kind="error" text={error} dismiss={() => setError('')} />}
    {notice && <Message kind="notice" text={notice} dismiss={() => setNotice('')} />}
    {screen === 'home' && <Landing analyze={openAnalyzer} register={() => { setAuthMode('register'); setAuthOpen(true); }} />}
    {screen === 'analyzer' && <Analyzer fileName={fileName} setFileName={setFileName} resumeText={resumeText} setResumeText={setResumeText} uploadStatus={uploadStatus} uploadFile={handleFile} analyze={analyze} loading={loading} consent={consentToAi} setConsent={setConsentToAi} back={() => setScreen('home')} sample={() => { setResumeText(sampleResume); setFileName('Synthetic student resume sample'); setUploadStatus('Fictional demo content loaded.'); }} user={user} register={() => { setAuthMode('register'); setAuthOpen(true); }} />}
    {screen === 'results' && analysis && <Results record={record} analysis={analysis} tab={tab} setTab={setTab} targetRole={targetRole} setTargetRole={setTargetRole} jobDescription={jobDescription} setJobDescription={setJobDescription} jobMatch={jobMatch} matchJob={matchJob} matching={matching} taskStatuses={taskStatuses} cycleTask={cycleTask} analyze={openAnalyzer} history={() => setScreen('history')} login={() => { setAuthMode('login'); setAuthOpen(true); }} />}
    {screen === 'history' && <HistoryScreen user={user} items={history} open={openSaved} remove={deleteSaved} analyze={openAnalyzer} login={() => { setAuthMode('login'); setAuthOpen(true); }} />}
    {screen === 'profile' && <ProfileScreen user={user} profile={profile || {}} storageMode={storageMode} save={saveProfile} signOut={signOut} />}
    {authOpen && <AuthModal mode={authMode} setMode={setAuthMode} submit={submitAuth} close={() => setAuthOpen(false)} error={error} clearError={() => setError('')} />}
    <Footer navigate={setScreen} />
  </div>;
}

function Header({ user, screen, menuOpen, setMenuOpen, navigate, login, register, signOut }) {
  return <header className="topbar">
    <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); navigate('home'); }}><span className="brand-mark"><Compass size={21} strokeWidth={2.5} /></span><span>CareerLens<span className="brand-ai">AI</span></span></a>
    <button className="mobile-menu-toggle" type="button" aria-label="Toggle navigation" onClick={() => setMenuOpen((open) => !open)}><Menu size={21} /></button>
    <nav className={`main-nav ${menuOpen ? 'mobile-open' : ''}`} aria-label="Main navigation">
      <a className={screen === 'home' ? 'nav-active' : ''} href="#home" onClick={(event) => { event.preventDefault(); navigate('home'); setMenuOpen(false); }}>Home</a>
      <a href="#features" onClick={(event) => { event.preventDefault(); navigate('home'); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false); }}>Features</a>
      <a href="#how-it-works" onClick={(event) => { event.preventDefault(); navigate('home'); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false); }}>How It Works</a>
      <a href="#career-insights" onClick={(event) => { event.preventDefault(); navigate('home'); document.getElementById('career-insights')?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false); }}>Career Insights</a>
    </nav>
    <div className="topbar-actions">{user ? <><button type="button" className="nav-action" onClick={() => navigate('history')}><History size={17} />My analyses</button><button type="button" className="profile-menu" onClick={() => navigate('profile')}><span className="avatar-small">{user.name?.[0]?.toUpperCase() || 'S'}</span><span>{user.name?.split(' ')[0]}</span><ChevronDown size={15} /></button><button type="button" className="signout-link" onClick={signOut}>Sign out</button></> : <><button type="button" className="login-link" onClick={login}>Login</button><button type="button" className="button button-primary button-small" onClick={register}>Get started <ArrowRight size={16} /></button></>}</div>
  </header>;
}

function Landing({ analyze, register }) {
  const steps = [['01', 'Add your resume', 'Upload a PDF or DOCX, or paste your resume text.'], ['02', 'Review the text', 'Correct any extraction mistakes before analysis.'], ['03', 'Explore your fit', 'See extracted evidence, possible roles, and skill gaps.'], ['04', 'Build your next step', 'Choose a target role and work through a practical roadmap.']];
  return <main>
    <section className="hero-section page-width"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> CAREER CLARITY FOR YOUR NEXT CHAPTER</div><h1>Turn your resume into your <span>career roadmap.</span></h1><p>Discover what your experience already says about you, where your evidence is thin, and what practical step to take next.</p><div className="hero-actions"><button type="button" className="button button-primary button-large" onClick={analyze}>Analyze my resume <ArrowRight size={18} /></button><a className="button button-secondary button-large" href="#features">Explore features <ArrowDown size={16} /></a></div><div className="trust-row"><span><Check size={15} /> PDF & DOCX support</span><span><Check size={15} /> Built for students</span><span><Check size={15} /> No hiring promises</span></div></div><HeroPreview /></section>
    <section className="trust-strip"><div className="page-width trust-strip-inner"><span>MADE FOR THE MOMENT BEFORE YOUR FIRST BIG YES</span><strong>Internships</strong><i /><strong>Graduate roles</strong><i /><strong>Career pivots</strong><i /><strong>Portfolio building</strong></div></section>
    <section className="section page-width" id="features"><div className="section-heading"><div className="eyebrow">A MORE USEFUL RESUME REVIEW</div><h2>Make your next move <span>with context.</span></h2><p>Go beyond a list of keywords. See what your resume supports, what’s missing from the page, and what to do about it.</p></div><div className="feature-grid">{featureData.map(([Icon, title, text], index) => <article className="feature-card" key={title}><span className={`feature-icon feature-icon-${index % 4}`}><Icon size={20} /></span><h3>{title}</h3><p>{text}</p><span className="feature-index">0{index + 1}</span></article>)}</div></section>
    <section className="process-section" id="how-it-works"><div className="page-width process-layout"><div className="process-intro"><div className="eyebrow">A PRACTICAL FOUR-STEP FLOW</div><h2>From resume draft to <span>next step.</span></h2><p>Your resume is the starting point. You stay in control of the text, the target role, and what goes into your plan.</p><button type="button" className="button button-dark" onClick={analyze}>Start with your resume <ArrowRight size={17} /></button></div><div className="step-list">{steps.map(([number, title, text]) => <article className="step-item" key={number}><span className="step-number">{number}</span><div><h3>{title}</h3><p>{text}</p></div><ChevronRight className="step-chevron" size={19} /></article>)}</div></div></section>
    <section className="section page-width" id="career-insights"><div className="insights-panel"><div className="insights-copy"><div className="eyebrow">CAREER INSIGHTS</div><h2>Start with roles that meet you <span>where you are.</span></h2><p>Explore role directions based on your resume evidence. Alignment is a rubric-based comparison, never a probability of being hired.</p><button type="button" className="button button-primary" onClick={analyze}>See my role matches <ArrowRight size={17} /></button></div><div className="role-cloud"><span className="role-cloud-label">EARLY-CAREER DIRECTIONS</span><div className="role-chips"><span><CodeSymbol /> Software Developer</span><span><BarChart3 size={15} /> Data Analyst</span><span><Compass size={15} /> UI/UX Designer</span><span><ShieldCheck size={15} /> QA Engineer</span><span><Activity size={15} /> Cloud Support</span><span><BriefcaseBusiness size={15} /> Business Analyst</span></div><div className="role-footnote"><ShieldCheck size={15} /> Suggestions are not live vacancies.</div></div></div></section>
    <section className="final-cta"><div className="page-width final-cta-inner"><div><div className="eyebrow light-eyebrow">YOUR RESUME. YOUR SKILLS. YOUR FUTURE.</div><h2>Make the next application <span>more intentional.</span></h2><p>Start with the experience you already have. Build from there.</p></div><button type="button" className="button button-white" onClick={register}>Create a free account <ArrowRight size={17} /></button><div className="cta-cross cross-one">+</div><div className="cta-cross cross-two">+</div></div></section>
  </main>;
}

function CodeSymbol() {
  return <span className="code-symbol" aria-hidden="true">&lt;/&gt;</span>;
}

function HeroPreview() {
  return <div className="hero-visual" aria-label="Preview of CareerLens resume insights"><div className="visual-orbit orbit-a" /><div className="visual-orbit orbit-b" /><div className="preview-window"><div className="preview-top"><span className="preview-dots"><i /><i /><i /></span><span>Resume insights</span><span className="preview-live"><i /> DEMO</span></div><div className="preview-body"><div className="preview-welcome"><div><small>YOUR CAREER SNAPSHOT</small><strong>A clearer next step.</strong></div><span className="preview-avatar"><GraduationCap size={19} /></span></div><div className="preview-metrics"><div><small>SKILLS FOUND</small><strong>12</strong><span>resume evidence</span></div><div><small>ROLE MATCHES</small><strong>04</strong><span>entry-level paths</span></div></div><div className="preview-chart-head"><div><small>SKILL EVIDENCE</small><span>Across your resume</span></div><span className="preview-chart-label">Project-backed</span></div><div className="preview-bars">{[45, 74, 60, 88, 54, 69, 92, 62].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><div className="preview-bar-labels"><span>Technical</span><span>Projects</span><span>Tools</span><span>People</span></div><div className="preview-recommendation"><span className="recommendation-icon"><Sparkles size={16} /></span><div><strong>Frontend Developer</strong><small>Evidence: React · UI projects</small></div><ArrowUpRight size={16} /></div><div className="preview-disclaimer">Resume-based estimates · not a hiring prediction</div></div></div><div className="floating-note note-top"><span className="note-icon cyan"><BadgeCheck size={16} /></span><span><strong>Evidence first</strong><small>Skills tied to your resume</small></span></div><div className="floating-note note-bottom"><span className="note-icon violet"><Target size={16} /></span><span><strong>One next step</strong><small>Built around your goals</small></span></div></div>;
}

function Analyzer({ fileName, setFileName, resumeText, setResumeText, uploadStatus, uploadFile, analyze, loading, consent, setConsent, back, sample, user, register }) {
  const [dragging, setDragging] = useState(false);
  return <main className="workspace page-width"><div className="workspace-heading"><button type="button" className="back-link" onClick={back}>← Back to home</button><div className="eyebrow">RESUME ANALYZER</div><h1>Start with your story.</h1><p>Upload a resume or paste its text. Review and edit extracted text before analysis.</p></div><div className="analyzer-layout"><section className="analyzer-main-card"><div className="input-tabs"><span className="input-tab-active"><FileText size={16} /> Resume content</span><span className="input-privacy"><LockKeyhole size={14} /> Private by default</span></div><label className={`upload-zone ${dragging ? 'upload-zone-dragging' : ''}`} htmlFor="resume-file" onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); uploadFile(event.dataTransfer.files[0]); }}><input id="resume-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { uploadFile(event.target.files[0]); event.target.value = ''; }} /><span className="upload-symbol"><CloudUpload size={23} /></span><strong>Drop your resume here</strong><span>or <u>browse files</u> · PDF or DOCX · up to 5 MB</span></label>{fileName && <div className="file-chip"><FileText size={16} /><span><strong>{fileName}</strong><small>{uploadStatus || 'Ready to review'}</small></span><button type="button" aria-label="Remove uploaded resume" onClick={() => { setFileName(''); setResumeText(''); }}><X size={17} /></button></div>}<div className="paste-divider"><span>OR PASTE RESUME TEXT</span></div><label className="sr-only" htmlFor="resume-text">Resume text</label><textarea id="resume-text" className="resume-editor" value={resumeText} onChange={(event) => setResumeText(event.target.value)} placeholder={'Paste your resume text here…\n\nInclude education, projects, experience, and skills for a more useful analysis.'} maxLength={60000} /><div className="editor-meta"><span>{resumeText.length.toLocaleString()} / 60,000 characters · minimum 80</span><button type="button" className="text-button" onClick={sample}><Plus size={14} /> Use synthetic sample</button></div><div className="consent-row"><label className="consent-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span className="custom-check"><Check size={12} /></span><span>Allow this resume text to be sent to the configured AI provider for analysis.</span></label><span className="consent-required">Optional</span></div><div className="privacy-note"><ShieldCheck size={16} /><span>Files are parsed in memory and discarded. Guest analyses are not saved. Signed-in analyses are saved to your history and can be deleted.</span></div><button type="button" className="button button-primary analyze-button" disabled={resumeText.trim().length < 80 || loading} onClick={analyze}>{loading ? <><LoaderCircle className="spin" size={18} /> Analyzing evidence…</> : <><Sparkles size={17} /> Analyze resume <ArrowRight size={17} /></>}</button>{!user && <div className="account-nudge">Want to save and reopen analysis history? <button type="button" onClick={register}>Create a free account</button></div>}</section><aside className="analyzer-aside"><div className="aside-card"><div className="aside-icon"><ShieldCheck size={18} /></div><h2>Your resume stays yours.</h2><p>Text is processed for this request. It is not stored for guest users. Sign in to save analysis results to private history.</p><div className="aside-divider" /><div className="aside-check"><CheckCircle2 size={15} /> No public resume links</div><div className="aside-check"><CheckCircle2 size={15} /> No fabricated achievements</div></div><div className="aside-card aside-demo"><span className="demo-pill"><Sparkles size={13} /> DEMO MODE AVAILABLE</span><h2>Try a synthetic resume.</h2><p>See how the results workspace is organized before adding your own details.</p><button type="button" className="text-button" onClick={sample}>Load sample resume <ArrowRight size={15} /></button><small>Sample content is fictional and labeled as synthetic.</small></div><div className="supported-files"><span>SUPPORTED FORMATS</span><div><i>PDF</i><i>DOCX</i><span>Text extraction only. Scanned PDFs need OCR.</span></div></div></aside></div></main>;
}

function Results({ record, analysis, tab, setTab, targetRole, setTargetRole, jobDescription, setJobDescription, jobMatch, matchJob, matching, taskStatuses, cycleTask, analyze, history, login }) {
  const skills = analysis.skillsAnalysis.skillEvidence;
  const jobs = analysis.jobRecommendations;
  const selectedRole = jobs.find((job) => job.title === targetRole) || jobs[0];
  const gaps = analysis.missingSkills.filter((gap) => gap.targetRole === selectedRole?.title);
  const categories = [...new Set(skills.map((skill) => skill.category))];
  const chartData = categories.map((category) => ({ category: category.replace(' & ', '/').replace('Languages', 'Lang.').replace('Development', 'Dev.'), count: skills.filter((skill) => skill.category === category).length }));
  const completed = Object.values(taskStatuses).filter((status) => status === 'Completed').length;
  return <main className="results-workspace page-width"><div className="results-title-row"><div><button type="button" className="back-link" onClick={history}>← My analyses</button><div className="eyebrow">ANALYSIS REPORT · {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Just now'}</div><h1>Your career snapshot.</h1><p>Resume-based evidence and suggestions. Alignment is not a probability of getting hired.</p></div><div className="result-actions"><button type="button" className="button button-secondary" onClick={() => window.print()}><Download size={16} /> Print / Save PDF</button><button type="button" className="button button-primary" onClick={analyze}><Sparkles size={16} /> Rerun analysis</button></div></div><div className={`analysis-mode-banner ${record.providerMode === 'ai' ? 'mode-ai' : ''}`}><span className="mode-badge">{record.providerMode === 'ai' ? 'AI ANALYSIS' : 'DEMO ANALYSIS'}</span><span>{record.providerMode === 'ai' ? 'AI interpretation based on your resume text. Verify every suggestion.' : 'Heuristic demo analysis based on resume text. Not a live LLM analysis.'}</span>{record.saved && <span className="saved-label"><CheckCircle2 size={14} /> Saved to your history</span>}</div><div className="results-tabs" role="tablist" aria-label="Analysis sections">{resultTabs.map(([name, Icon]) => <button key={name} type="button" role="tab" aria-selected={tab === name} className={tab === name ? 'results-tab active' : 'results-tab'} onClick={() => setTab(name)}><Icon size={15} /><span>{name}</span></button>)}</div><section className="results-content" aria-live="polite">{tab === 'Overview' && <OverviewTab analysis={analysis} skills={skills} chartData={chartData} onSelectTab={setTab} />}{tab === 'Resume Summary' && <SummaryTab summary={analysis.resumeSummary} />}{tab === 'Skills Analysis' && <SkillsTab skills={skills} chartData={chartData} />}{tab === 'Job Recommendations' && <JobsTab jobs={jobs} />}{tab === 'Missing Skills' && <GapsTab jobs={jobs} selectedRole={selectedRole} targetRole={targetRole} setTargetRole={setTargetRole} gaps={gaps} />}{tab === 'Learning Roadmap' && <LearningTab suggestions={analysis.learningSuggestions} taskStatuses={taskStatuses} cycleTask={cycleTask} completed={completed} />}{tab === 'Resume Improvements' && <ImprovementsTab improvements={analysis.resumeImprovements} />}{tab === 'Job Description Match' && <JobMatchTab jobDescription={jobDescription} setJobDescription={setJobDescription} onSubmit={matchJob} matching={matching} result={jobMatch} />}</section><div className="results-bottom"><span><LockKeyhole size={14} /> Your analysis belongs to your account.</span>{!record.saved && <button type="button" className="text-button" onClick={login}>Sign in to save analysis <ArrowRight size={14} /></button>}{record.saved && <button type="button" className="text-button" onClick={history}>View saved analyses <ArrowRight size={14} /></button>}</div><div className="print-only"><h1>CareerLens resume analysis — {record.title}</h1><p>Resume-based estimates only.</p><pre>{JSON.stringify(analysis, null, 2)}</pre></div></main>;
}

function OverviewTab({ analysis, skills, chartData, onSelectTab }) {
  const summary = analysis.resumeSummary;
  const top = analysis.jobRecommendations[0];
  return <div className="overview-layout"><div className="overview-primary"><article className="result-card candidate-card"><div className="card-kicker"><GraduationCap size={16} /> CANDIDATE OVERVIEW</div><p>{summary.overview}</p><div className="fact-chips"><span><FileText size={14} /> {summary.extractedFacts.length} extracted facts</span><span><BarChart3 size={14} /> {skills.length} evidenced skills</span></div>{summary.strengths.slice(0, 3).map((text) => <div className="strength-line" key={text}><CheckCircle2 size={15} />{text}</div>)}</article><article className="result-card"><div className="card-heading"><div><div className="card-kicker">EVIDENCE BY CATEGORY</div><h2>Resume skill map</h2></div><button className="text-button" onClick={() => onSelectTab('Skills Analysis')}>See all skills <ArrowRight size={14} /></button></div>{chartData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height={230}><BarChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9edf4" /><XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#68768e' }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#68768e' }} /><Tooltip /><Bar dataKey="count" name="Skills evidenced" radius={[6, 6, 0, 0]}>{chartData.map((item, index) => <Cell key={item.category} fill={['#536de0', '#30b6cb', '#8065dc', '#3153a7'][index % 4]} />)}</Bar></BarChart></ResponsiveContainer></div> : <EmptyState text="No skill keywords were clearly evidenced in this resume text." />}</article><article className="result-card top-role-card"><div className="card-kicker"><BriefcaseBusiness size={16} /> STRONGEST ROLE ALIGNMENT</div>{top ? <><div className="top-role-content"><div><h2>{top.title}</h2><p>{top.reason}</p></div><ScoreRing score={top.alignmentScore} /></div><div className="role-match-tags">{top.matchingSkills.slice(0, 4).map((skill) => <span key={skill}>{skill}</span>)}{!top.matchingSkills.length && <span>Evidence developing</span>}</div><button className="text-button" onClick={() => onSelectTab('Job Recommendations')}>Explore recommendations <ArrowRight size={15} /></button></> : <EmptyState text="Add more resume evidence to see role directions." />}</article></div><aside className="overview-side"><div className="metric-stack"><Metric icon={BriefcaseBusiness} label="Suggested role directions" value={analysis.jobRecommendations.length} tone="blue" /><Metric icon={Target} label="Priority skill gaps" value={analysis.missingSkills.filter((item) => item.priority === 'High').length} tone="violet" /><Metric icon={NotebookPen} label="Resume improvements" value={analysis.resumeImprovements.length} tone="cyan" /><Metric icon={BookOpen} label="Learning suggestions" value={analysis.learningSuggestions.length} tone="gold" /></div><article className="result-card next-step-card"><div className="card-kicker"><Lightbulb size={16} /> A USEFUL NEXT STEP</div><h2>{analysis.missingSkills[0]?.skill || 'Strengthen project evidence'}</h2><p>{analysis.missingSkills[0]?.reason || 'Add one project with your specific contribution and tools used.'}</p><button className="text-button" onClick={() => onSelectTab('Learning Roadmap')}>Open learning roadmap <ArrowRight size={14} /></button></article><div className="score-note"><ShieldCheck size={17} /><span>Alignment score uses evidenced skills, project evidence, and education signals. It is not a hiring probability.</span></div></aside></div>;
}

function ScoreRing({ score }) { return <div className="score-ring" style={{ '--score': `${score}%` }}><div><strong>{score}%</strong><span>alignment</span></div></div>; }
function Metric({ icon: Icon, label, value, tone }) { return <div className="metric-card"><span className={`metric-icon ${tone}`}><Icon size={17} /></span><span><small>{label}</small><strong>{value}</strong></span></div>; }

function SummaryTab({ summary }) {
  const groups = [['Education', summary.education, GraduationCap], ['Experience', summary.experience, BriefcaseBusiness], ['Projects', summary.projects, NotebookPen], ['Certifications', summary.certifications, BadgeCheck]];
  return <div className="summary-layout"><article className="result-card summary-lead"><div className="card-kicker"><Sparkles size={16} /> RESUME SUMMARY</div><h2>What your resume currently communicates</h2><p>{summary.overview}</p>{summary.strengths.map((text) => <div className="strength-line" key={text}><CheckCircle2 size={15} />{text}</div>)}</article><div className="summary-groups">{groups.map(([title, items, Icon]) => <article className="result-card detail-group" key={title}><div className="card-heading"><div className="group-title"><span className="group-icon"><Icon size={17} /></span><h2>{title}</h2></div><span className="group-count">{items.length}</span></div>{items.length ? <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul> : <EmptyState text={`No ${title.toLowerCase()} details were clearly found in the resume text.`} />}</article>)}</div><article className="result-card"><div className="card-kicker">UNCLEAR OR MISSING INFORMATION</div>{summary.unclearInformation.length ? <ul className="plain-list">{summary.unclearInformation.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted-copy">No major missing sections were flagged.</p>}<p className="small-disclaimer">Extracted facts are copied from resume text. AI-generated interpretations should be reviewed.</p><details className="fact-disclosure"><summary>Show extracted facts <ChevronDown size={15} /></summary><ul>{summary.extractedFacts.map((fact, index) => <li key={index}>{fact}</li>)}</ul></details></article></div>;
}

function SkillsTab({ skills, chartData }) {
  const [category, setCategory] = useState('All');
  const categories = ['All', ...new Set(skills.map((item) => item.category))];
  const filtered = category === 'All' ? skills : skills.filter((item) => item.category === category);
  const radarData = chartData.map((item) => ({ category: item.category, evidence: Math.min(100, item.count * 24) }));
  return <div className="skills-view"><div className="view-header"><div><div className="card-kicker">EVIDENCE, NOT A SKILL TEST</div><h2>Skills in your resume</h2><p>A keyword is not proof of proficiency. Review the evidence and verify it against your experience.</p></div><label className="compact-select-label">Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="skills-summary-grid"><div className="result-card skills-radar-card"><div className="card-kicker">SKILL DISTRIBUTION</div>{radarData.length ? <ResponsiveContainer width="100%" height={280}><RadarChart data={radarData}><PolarGrid stroke="#e5e9f2" /><PolarAngleAxis dataKey="category" tick={{ fill: '#64738e', fontSize: 11 }} /><Radar dataKey="evidence" stroke="#526ee0" fill="#526ee0" fillOpacity={0.22} /></RadarChart></ResponsiveContainer> : <EmptyState text="Skill distribution appears after skills are extracted." />}<p className="chart-caption">Counts reflect terms found in the resume, not validated proficiency.</p></div><div className="skill-list">{filtered.length ? filtered.map((skill, index) => <article className="skill-evidence-card" key={`${skill.name}-${index}`}><div className="skill-title-row"><span className="skill-category-icon"><Check size={15} /></span><div><strong>{skill.name}</strong><span>{skill.category}</span></div><span className={`evidence-type ${skill.evidenceType.toLowerCase()}`}>{skill.evidenceType}</span></div><blockquote>“{skill.evidence}”</blockquote><div className="skill-evidence-footer"><span>{skill.relatedExperience || 'No related project identified'}</span><span>{Math.round(skill.confidence * 100)}% extraction confidence</span></div></article>) : <div className="result-card"><EmptyState text="No skills were found in this category." /></div>}</div></div></div>;
}

function JobsTab({ jobs }) { return <div className="jobs-view"><div className="view-header"><div><div className="card-kicker">DIRECTION, NOT VACANCIES</div><h2>Potential early-career roles</h2><p>Recommendations based on your resume; these are not verified job listings.</p></div><span className="rubric-pill"><BarChart3 size={15} /> 60% skills · 25% projects · 15% education</span></div><div className="job-list">{jobs.map((job, index) => <details className="job-card" key={job.title} open={index === 0}><summary><span className="job-rank">0{index + 1}</span><span className="job-summary-copy"><strong>{job.title}</strong><small>{job.category} · {job.experienceLevel}</small></span><ScoreRing score={job.alignmentScore} /><ChevronDown className="job-chevron" size={18} /></summary><div className="job-detail"><p>{job.reason}</p><div className="job-detail-columns"><div><h3>Evidence already present</h3>{job.matchingSkills.length ? <div className="tag-list">{job.matchingSkills.map((item) => <span className="skill-tag present" key={item}>{item}</span>)}</div> : <span className="muted-copy">No matching skills were explicitly found.</span>}</div><div><h3>Underrepresented in resume</h3>{job.missingSkills.length ? <div className="tag-list">{job.missingSkills.map((item) => <span className="skill-tag missing" key={item}>{item}</span>)}</div> : <span className="muted-copy">Core requirements are evidenced.</span>}</div></div><h3>Preparation steps</h3><ol className="numbered-list">{job.preparationSteps.map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}</ol><h3>Portfolio project direction</h3><p>{job.suggestedProjects.join(' ')}</p></div></details>)}</div></div>; }

function GapsTab({ jobs, selectedRole, targetRole, setTargetRole, gaps }) { return <div className="gaps-view"><div className="view-header"><div><div className="card-kicker">ROLE-SPECIFIC COMPARISON</div><h2>Choose where to focus.</h2><p>“Missing from resume” means evidence was not found on the page, not that you lack the skill.</p></div><label className="compact-select-label">Target role<select value={targetRole} onChange={(event) => setTargetRole(event.target.value)}>{jobs.map((job) => <option key={job.title}>{job.title}</option>)}</select></label></div>{selectedRole && <div className="gap-summary-row"><div className="result-card gap-score-card"><span className="card-kicker">PROFILE ALIGNMENT</span><ScoreRing score={selectedRole.alignmentScore} /><p>Resume evidence estimate<br />not hiring probability</p></div><div className="result-card"><div className="card-kicker">ALREADY PRESENT</div><div className="tag-list">{selectedRole.matchingSkills.length ? selectedRole.matchingSkills.map((skill) => <span className="skill-tag present" key={skill}>{skill}</span>) : <p className="muted-copy">No explicit matching skills yet.</p>}</div></div><div className="result-card"><div className="card-kicker">IMPORTANT GAPS</div><div className="tag-list">{selectedRole.missingSkills.length ? selectedRole.missingSkills.map((skill) => <span className="skill-tag missing" key={skill}>{skill}</span>) : <p className="muted-copy">No core gaps were identified.</p>}</div></div></div>}<div className="gap-list">{gaps.length ? gaps.map((gap, index) => <article className="gap-item" key={`${gap.skill}-${index}`}><span className={`priority-mark priority-${gap.priority.toLowerCase()}`} /><div><div className="gap-title"><strong>{gap.skill}</strong><span className={`priority-badge ${gap.priority.toLowerCase()}`}>{gap.priority} priority</span><span className="missing-from-resume">Missing from resume</span></div><p>{gap.reason}</p><small>{gap.currentEvidence}</small></div><span className="recommend-next">Recommended next</span></article>) : <article className="result-card"><EmptyState text="No prioritized skill gaps are available for this role yet." /></article>}</div></div>; }

function LearningTab({ suggestions, taskStatuses, cycleTask, completed }) {
  const total = suggestions.reduce((count, item) => count + item.activities.length, 0);
  return <div className="learning-view"><div className="view-header"><div><div className="card-kicker">PERSONALIZED PRACTICE PLAN</div><h2>Build evidence one step at a time.</h2><p>Use these suggestions as a starting point. Choose free or paid resources that fit your own schedule.</p></div><div className="learning-progress"><span>{completed} / {total} tasks complete</span><div><i style={{ width: `${total ? Math.round((completed / total) * 100) : 0}%` }} /></div></div></div><div className="roadmap-stages">{['Fundamentals', 'Practical Skills', 'Portfolio Development', 'Job Preparation'].map((stage, index) => <span className={index === 0 ? 'stage-active' : ''} key={stage}><i>{index + 1}</i>{stage}</span>)}</div>{suggestions.length ? <div className="learning-list">{suggestions.map((item, index) => <article className="learning-card" key={`${item.topic}-${index}`}><div className="learning-card-head"><span className="learning-number">0{index + 1}</span><div><h3>{item.topic}</h3><p>{item.reason}</p></div><span className="difficulty-badge">{item.difficulty} · ~{item.estimatedHours} hrs</span></div><div className="learning-card-body"><div><h4>Practice activities</h4>{item.activities.map((activity, activityIndex) => { const taskKey = `${index}-${activityIndex}`; const status = taskStatuses[taskKey] || 'Not Started'; return <button key={taskKey} type="button" className={`learning-task task-${status.toLowerCase().replace(' ', '-')}`} onClick={() => cycleTask(taskKey)}><span className="task-state">{status === 'Completed' ? <Check size={13} /> : status === 'In Progress' ? <Activity size={13} /> : <Plus size={13} />}</span><span>{activity}</span><small>{status}</small></button>; })}</div><div><h4>Verified resources</h4>{item.resources.length ? item.resources.map((resource) => <a className="resource-link" key={resource.url} href={resource.url} target="_blank" rel="noreferrer"><span><BookOpen size={15} /></span><div><strong>{resource.title}</strong><small>{resource.provider} · official resource</small></div><ArrowUpRight size={15} /></a>) : <p className="muted-copy">No verified resource link is listed for this topic yet.</p>}</div></div></article>)}</div> : <article className="result-card"><EmptyState text="No learning tasks were generated from the available evidence." /></article>}<div className="learning-note"><Lightbulb size={17} /><span>Roadmap duration is an estimate. Progress is stored in this browser for this analysis.</span></div></div>;
}

function ImprovementsTab({ improvements }) { return <div className="improvements-view"><div className="view-header"><div><div className="card-kicker">SPECIFIC, TRUTHFUL EDITS</div><h2>Make the evidence easier to see.</h2><p>Suggestions use placeholders where details are missing. Only add claims you can verify.</p></div></div>{improvements.length ? <div className="improvement-list">{improvements.map((item, index) => <article className="improvement-card" key={`${item.section}-${index}`}><div className="improvement-top"><span className="improvement-section"><NotebookPen size={15} />{item.section}</span><span className={`priority-badge ${item.priority.toLowerCase()}`}>{item.priority} priority</span></div><h3>{item.issue}</h3><p>{item.explanation}</p>{item.originalText && <div className="text-comparison original"><small>ORIGINAL EXCERPT</small><p>{item.originalText}</p></div>}<div className="text-comparison suggested"><small>SUGGESTED DIRECTION</small><p>{item.suggestedText}</p></div></article>)}</div> : <article className="result-card"><EmptyState text="No specific improvement suggestions were generated from the available text." /></article>}</div>; }

function JobMatchTab({ jobDescription, setJobDescription, onSubmit, matching, result }) { return <div className="job-match-layout"><div className="job-match-intro"><div className="card-kicker">OPTIONAL ROLE-SPECIFIC REVIEW</div><h2>Compare your resume with a job description.</h2><p>Review overlap and evidence gaps. This does not predict ATS results or guarantee selection.</p></div><form className="job-description-form" onSubmit={onSubmit}><label htmlFor="job-description">Job description text</label><textarea id="job-description" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the role description here…" minLength={100} maxLength={30000} required /><div className="job-match-form-footer"><span>{jobDescription.length.toLocaleString()} / 30,000 characters</span><button className="button button-primary" disabled={matching || jobDescription.trim().length < 100}>{matching ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />}{matching ? 'Comparing…' : 'Compare descriptions'}</button></div></form>{result && <div className="job-match-results"><div className="result-card match-score"><span className="card-kicker">TEXT OVERLAP</span><strong>{result.alignmentScore}%</strong><span>Keyword overlap only · not an ATS score</span></div><div className="result-card"><div className="card-kicker">MATCHING WORDS</div><div className="tag-list">{result.matchingSkills.map((skill) => <span className="skill-tag present" key={skill}>{skill}</span>)}</div><p className="small-disclaimer">{result.supportedEvidence.join(' · ')}</p></div><div className="result-card"><div className="card-kicker">NOT FOUND IN RESUME TEXT</div><div className="tag-list">{result.missingKeywords.map((skill) => <span className="skill-tag missing" key={skill}>{skill}</span>)}</div></div><div className="result-card"><div className="card-kicker">QUESTIONS TO CONSIDER</div><ul className="plain-list">{result.clarificationQuestions.map((question) => <li key={question}>{question}</li>)}</ul></div></div>}</div>; }

function HistoryScreen({ user, items, open, remove, analyze, login }) { return <main className="workspace page-width"><div className="workspace-heading"><div className="eyebrow">YOUR CAREERLENS SPACE</div><h1>Analysis history.</h1><p>Reopen or remove saved analyses from your account.</p></div>{user ? items.length ? <div className="history-list">{items.map((item) => <article className="history-card" key={item.id}><span className="history-icon"><FileText size={19} /></span><button type="button" className="history-main" onClick={() => open(item)}><strong>{item.title}</strong><span>{new Date(item.createdAt).toLocaleString()} · {item.providerMode === 'ai' ? 'AI analysis' : 'Demo analysis'}</span></button><button type="button" className="icon-button" aria-label={`Delete ${item.title}`} onClick={() => remove(item.id)}><Trash2 size={17} /></button></article>)}</div> : <EmptyPanel icon={History} title="No saved analyses yet." text="Sign-in analyses will appear here. Guest analyses are not retained." action="Analyze a resume" onAction={analyze} /> : <EmptyPanel icon={LockKeyhole} title="Sign in to see saved analyses." text="Guest sessions are private and are not saved." action="Login" onAction={login} />}</main>; }

function ProfileScreen({ user, profile, storageMode, save, signOut }) { return <main className="workspace page-width"><div className="workspace-heading"><div className="eyebrow">STUDENT PROFILE</div><h1>Make recommendations more personal.</h1><p>Add your background and preferences to guide future analysis.</p></div><form className="profile-form result-card" onSubmit={save}><div className="profile-identity"><span className="profile-avatar"><UserRound size={23} /></span><div><strong>{user?.name}</strong><small>{user?.email} · {storageMode === 'postgres' ? 'PostgreSQL account' : 'Temporary demo account'}</small></div></div><div className="profile-fields"><label>College / university<input name="college" defaultValue={profile.college || ''} placeholder="e.g. North Valley University" /></label><label>Degree<input name="degree" defaultValue={profile.degree || ''} placeholder="e.g. BSc Computer Science" /></label><label>Department<input name="department" defaultValue={profile.department || ''} placeholder="e.g. Computer Science" /></label><label>Graduation year<input name="graduationYear" type="number" min="1950" max="2100" defaultValue={profile.graduation_year || ''} /></label><label>Preferred roles <small>Separate with commas</small><input name="preferredRoles" defaultValue={(profile.preferred_roles || []).join(', ')} placeholder="Frontend Developer, Data Analyst" /></label><label>Preferred location<input name="preferredLocation" defaultValue={profile.preferred_location || ''} placeholder="City or remote" /></label><label>Experience level<select name="experienceLevel" defaultValue={profile.experience_level || 'Entry-level'}><option>Student</option><option>Internship</option><option>Entry-level</option><option>Graduate</option></select></label></div><div className="profile-actions"><button type="submit" className="button button-primary">Save profile <Check size={16} /></button><button type="button" className="text-button" onClick={signOut}>Sign out</button></div><div className="privacy-note"><ShieldCheck size={16} /><span>Your profile is only used to personalize your account. Account deletion cascades to associated history.</span></div></form></main>; }

function AuthModal({ mode, setMode, submit, close, error, clearError }) { const registering = mode === 'register'; return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" type="button" aria-label="Close" onClick={close}><X size={19} /></button><div className="auth-modal-mark"><Compass size={21} /></div><div className="eyebrow">CAREERLENS AI</div><h2 id="auth-title">{registering ? 'Create your student account.' : 'Welcome back.'}</h2><p>{registering ? 'Save analyses and keep your learning plan in one place.' : 'Sign in to reopen saved analyses and update your profile.'}</p>{error && <div className="auth-error" role="alert">{error}<button type="button" onClick={clearError}><X size={15} /></button></div>}<form onSubmit={submit}>{registering && <label>Full name<input name="name" autoComplete="name" minLength={2} maxLength={100} required placeholder="Your name" /></label>}<label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.edu" /></label><label>Password<input name="password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 8 : 1} maxLength={128} required placeholder={registering ? 'At least 8 characters' : 'Your password'} /></label><button type="submit" className="button button-primary auth-submit">{registering ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></button></form><div className="auth-switch">{registering ? 'Already have an account?' : 'New to CareerLens?'} <button type="button" onClick={() => { setMode(registering ? 'login' : 'register'); clearError(); }}>{registering ? 'Sign in' : 'Create account'}</button></div><div className="auth-privacy"><LockKeyhole size={13} /> Account data is private to your student account.</div></section></div>; }

function Footer({ navigate }) { return <footer className="site-footer"><div className="page-width footer-main"><a className="brand footer-brand" href="#home" onClick={(event) => { event.preventDefault(); navigate('home'); }}><span className="brand-mark"><Compass size={20} /></span><span>CareerLens<span className="brand-ai">AI</span></span></a><p>Your Resume. Your Skills. Your Future.</p><div className="footer-links"><a href="#about">About</a><a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="mailto:hello@careerlens.local">Contact</a></div></div><div className="page-width footer-legal"><span>© 2026 CareerLens AI</span><span>Resume-based estimates are not hiring guarantees or live job listings.</span></div></footer>; }

function Message({ kind, text, dismiss }) { return <div className={`global-message ${kind}-message`} role="status">{kind === 'error' ? <CircleHelp size={17} /> : <CheckCircle2 size={17} />}{text}<button type="button" aria-label="Dismiss message" onClick={dismiss}><X size={16} /></button></div>; }
function EmptyState({ text }) { return <div className="empty-state"><span><Search size={17} /></span><p>{text}</p></div>; }
function EmptyPanel({ icon: Icon, title, text, action, onAction }) { return <article className="empty-panel"><Icon size={26} /><h2>{title}</h2><p>{text}</p><button type="button" className="button button-primary" onClick={onAction}>{action} <ArrowRight size={16} /></button></article>; }

export default CareerLensApp;
