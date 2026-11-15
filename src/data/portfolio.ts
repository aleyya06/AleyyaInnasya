// Every piece of copy on the site. Components only lay it out.

export interface Link {
  label: string;
  href: string;
  external?: boolean;
}

export interface Profile {
  firstLine: string;
  secondLine: string;
  fullName: string;
  tagline: string;
  location: string;
  email: string;
  linkedin: string;
  github: string;
}

export interface Education {
  school: string;
  degree: string;
  period: string;
  focus: string;
}

export interface Award {
  title: string;
  year: string;
}

export type ProjectCategory = "apps" | "systems" | "upcoming";
export type ProjectVisual = "phone" | "browser" | "snake" | "soon";

export interface Project {
  id: string;
  sheet: string;
  title: string;
  tech: string;
  category: ProjectCategory;
  visual: ProjectVisual;
  description: string;
  /** Words shown in italics inside the description, such as class names */
  emphasis?: string[];
  image?: string;
  imageCaption?: string;
  links: Link[];
}

export interface Experience {
  id: string;
  period: string;
  role: string;
  org: string;
  points: string[];
}

export interface SkillGroup {
  name: string;
  skills: string[];
}

export interface Certificate {
  name: string;
  issuer: string;
  date: string;
  image: string;
  alt: string;
  verifyUrl: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export const profile: Profile = {
  firstLine: "Aleyya Innasya",
  secondLine: "El Karima Wicaksono",
  fullName: "Aleyya Innasya El Karima Wicaksono",
  tagline: "Mathematics undergraduate at ITS building responsive web and mobile applications while exploring data analysis.",
  location: "Surabaya, Indonesia",
  email: "aleyyainnasya@gmail.com",
  linkedin: "https://www.linkedin.com/in/aleyyainnasya/",
  github: "https://github.com/aleyya06",
};

export const nav: NavItem[] = [
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

export const about = {
  headline: "Learning to make data accurate, organized, and useful.",
  lead:
    "I'm a Mathematics undergraduate at ITS (class of 2024) focused on web and mobile application development. I combine structured analytical thinking with hands on engineering to build responsive web platforms and cross platform mobile apps from interactive learning tools to end to end order tracking systems.",
  body:
    "Alongside building products with Flutter, modern web technologies, and object oriented design, I'm also actively learning data analysis and processing with Python and SQL. I'm open to collaborative product builds where I can build, learn, and contribute.",
};

export const education: Education = {
  school: "Institut Teknologi Sepuluh Nopember (ITS)",
  degree: "Bachelor of Mathematics",
  period: "2024 – Present",
  focus:
    "Undergraduate Mathematics Student, focused on data organization, mathematical modeling, and software craftsmanship.",
};

export const awards: Award[] = [
  { title: "Finalist — Physics National Science Olympiad (OSN), Surabaya City Level", year: "2023" },
  { title: "Bronze Diploma — University of Surabaya Choir Festival, Mixed Youth Choir Category", year: "2022" },
];

export const projects: Project[] = [
  {
    id: "hanzee",
    sheet: "Sheet P-01",
    title: "Hanzee",
    tech: "Flutter · App",
    category: "apps",
    visual: "phone",
    image: "/assets/hanzee-icon.png",
    imageCaption: "Hanzee",
    description:
      "A Flutter app that teaches Mandarin to Indonesian and English-speaking beginners, from the first nǐ hǎo to HSK 5. Features a Hanzi Writing Lab that checks strokes, spaced-repetition flashcards, grammar cards, listening and pronunciation practice, and a garden that grows as you learn with Bao the panda and Kopi the bear.",
    links: [
      { label: "Try the web version ↗", href: "https://aleyya06.github.io/Hanzee/", external: true },
      { label: "Download Android APK (67 MB)", href: "https://github.com/aleyya06/Hanzee/releases/latest/download/app-release.apk" },
    ],
  },
  {
    id: "pawfox",
    sheet: "Sheet P-02",
    title: "PawFox GO",
    tech: "Web App · Live",
    category: "apps",
    visual: "browser",
    image: "/assets/pawfox-logo.png",
    imageCaption: "pawfox.web.id",
    description:
      "A web platform for personal-managed K-pop group orders from Thailand, South Korea, China, and Japan. Buyers can browse ongoing batches per country, convert GO rates to rupiah, track parcels from the warehouse to Indonesia, and check their invoices—complete with buyer reviews.",
    links: [{ label: "Visit PawFox GO ↗", href: "https://pawfox.web.id", external: true }],
  },
  {
    id: "snake",
    sheet: "Sheet P-03",
    title: "Snake Game",
    tech: "Java · OOP",
    category: "systems",
    visual: "snake",
    description:
      "A desktop Snake game built as a team OOP project, split into five classes (SnakeMain, MainMenuPanel, SnakePanel, GameOverPanel, ImageLoader). Designed first with UML class diagrams, featuring keyboard controls and custom skin & food customization.",
    emphasis: ["SnakeMain", "MainMenuPanel", "SnakePanel", "GameOverPanel", "ImageLoader"],
    links: [{ label: "View project deck ↗", href: "/projects/snake-game.html" }],
  },
  {
    id: "data",
    sheet: "Sheet P-04",
    title: "Data Analysis Projects",
    tech: "SQL · Python",
    category: "upcoming",
    visual: "soon",
    description:
      "A space reserved for my upcoming projects. As I continue learning SQL, Python, and data analysis — building on my Dicoding certifications — new work will be showcased here.",
    links: [],
  },
];

export const projectFilters: { id: "all" | Exclude<ProjectCategory, "upcoming">; label: string }[] = [
  { id: "all", label: "All" },
  { id: "apps", label: "Mobile & Web" },
  { id: "systems", label: "Systems & OOP" },
];

export const experience: Experience[] = [
  {
    id: "exp-1",
    period: "Oct 2025 – Nov 2025",
    role: "Event Staff",
    org: "ITS Chess Tournament 2025",
    points: [
      "Coordinated event logistics and rundown, serving as Master of Ceremony for participants.",
      "Collaborated with the organizing committee to ensure smooth event execution.",
    ],
  },
  {
    id: "exp-2",
    period: "Sep 2025",
    role: "Master of Ceremony",
    org: "Open House, Mathematics Department ITS",
    points: [
      "Hosted and facilitated the department's open house event.",
      "Coordinated with the event committee to ensure a smooth program flow.",
    ],
  },
  {
    id: "exp-3",
    period: "Jun 2025 – Aug 2025",
    role: "Finance Staff",
    org: "Aksi Nirwasita 6.0 — FSAD ITS",
    points: [
      "Managed and organized financial data systematically using spreadsheets to ensure accuracy and accessibility.",
      "Maintained high attention to detail in verifying records and generating accurate reports.",
    ],
  },
  {
    id: "exp-4",
    period: "Oct 2023 – Nov 2023",
    role: "Marketing",
    org: "Cendolino — Car Free Day Surabaya",
    points: [
      "Interacted directly with customers and handled sales at Car Free Day.",
      "Recorded daily sales figures and designed visual promo materials using Canva.",
      "Reached sales targets through good customer service and deep product knowledge.",
    ],
  },
  {
    id: "exp-5",
    period: "Feb 2023 – Mar 2023",
    role: "Marketing",
    org: "Browcup — SMA Muhammadiyah 2 Surabaya",
    points: [
      "Recorded daily and weekly sales and produced complete sales reports.",
      "Designed promo materials using Canva and contributed to boosting chocolate brownie sales through effective marketing strategies.",
    ],
  },
];

export const skillGroups: SkillGroup[] = [
  {
    name: "Data Analysis & Mathematical Modeling",
    skills: ["Python", "SQL", "Data Analysis", "Mathematical Modeling", "Spreadsheets"],
  },
  {
    name: "Web & Mobile Development",
    skills: ["Flutter", "React", "TypeScript", "Three.js", "Java OOP", "Git"],
  },
  {
    name: "UI & Visual Design",
    skills: ["UI Design", "Visual Design", "Canva"],
  },
];

export const certificates: Certificate[] = [
  {
    name: "Belajar Dasar Data Science",
    issuer: "Dicoding Indonesia",
    date: "Jul 2026",
    image: "/assets/certificates/cert-data-science.jpg",
    alt: "Dicoding certificate — Belajar Dasar Data Science, awarded to Aleyya Innasya El Karima Wicaksono",
    verifyUrl: "https://www.dicoding.com/certificates/JMZVOK6LQXN9",
  },
  {
    name: "Belajar Dasar Structured Query Language (SQL)",
    issuer: "Dicoding Indonesia",
    date: "Jul 2026",
    image: "/assets/certificates/cert-sql.jpg",
    alt: "Dicoding certificate — Belajar Dasar Structured Query Language (SQL), awarded to Aleyya Innasya El Karima Wicaksono",
    verifyUrl: "https://www.dicoding.com/certificates/JMZVOK6JQXN9",
  },
  {
    name: "Spec-Driven Development dengan Kiro",
    issuer: "Dicoding Indonesia",
    date: "Jul 2026",
    image: "/assets/certificates/cert-kiro.jpg",
    alt: "Dicoding certificate — Spec-Driven Development dengan Kiro, awarded to Aleyya Innasya El Karima Wicaksono",
    verifyUrl: "https://www.dicoding.com/certificates/EYX4QW48WPDL",
  },
  {
    name: "Introduction to Financial Literacy",
    issuer: "Dicoding Indonesia",
    date: "Jul 2026",
    image: "/assets/certificates/cert-financial-literacy.jpg",
    alt: "Dicoding certificate — Introduction to Financial Literacy, awarded to Aleyya Innasya El Karima Wicaksono",
    verifyUrl: "https://www.dicoding.com/certificates/6RPN7LJE5X2M",
  },
];

export const snakeDeck = {
  title: "Snake Game",
  tech: "Java · OOP",
  description:
    "A desktop Snake game built as a team OOP project (with Fatkhul Barri). The app is split into five classes — SnakeMain (entry point), MainMenuPanel (main menu plus skin & food customization), SnakePanel (core game logic: movement, collisions, and score), GameOverPanel, and ImageLoader (loads PNG/JPG/GIF resources). Designed first with UML class diagrams. The full deck is embedded below.",
  emphasis: ["SnakeMain", "MainMenuPanel", "SnakePanel", "GameOverPanel", "ImageLoader"],
  pdf: "/assets/snake-game-presentation.pdf",
};
