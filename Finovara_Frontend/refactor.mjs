import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';
import path from 'path';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('./src/app/App.tsx');

const mapping = {
  // Constants -> src/utils/constants.ts
  'NAV_ITEMS': 'src/utils/constants.ts',
  'STATS': 'src/utils/constants.ts',
  'SERVICES': 'src/utils/constants.ts',
  'INDUSTRIES': 'src/utils/constants.ts',
  'FEATURES': 'src/utils/constants.ts',
  'WORKFLOW': 'src/utils/constants.ts',
  'FEATURED_ASSIGNMENTS': 'src/utils/constants.ts',
  'COMPLIANCE_CALENDAR': 'src/utils/constants.ts',
  'TESTIMONIALS': 'src/utils/constants.ts',
  'INSIGHTS': 'src/utils/constants.ts',
  'FAQS': 'src/utils/constants.ts',
  'OPEN_POSITIONS': 'src/utils/constants.ts',
  'INDUSTRY_DETAILS': 'src/utils/constants.ts',

  // Types -> src/types/index.ts
  'Page': 'src/types/index.ts',

  // Hooks
  'useCountUp': 'src/hooks/useCountUp.ts',

  // Helpers
  'handleAddCalendar': 'src/utils/helpers.ts',
  'handleDownloadResource': 'src/utils/helpers.ts',

  // Components
  'StatCard': 'src/components/common/StatCard.tsx',
  'Navbar': 'src/components/navbar/Navbar.tsx',
  'AnnouncementBar': 'src/components/common/AnnouncementBar.tsx',
  'ArticleModal': 'src/components/modals/ArticleModal.tsx',
  'Footer': 'src/components/footer/Footer.tsx',

  // Pages
  'HomePage': 'src/pages/Home/Home.tsx',
  'AboutPage': 'src/pages/About/About.tsx',
  'ServicesPage': 'src/pages/Services/Services.tsx',
  'IndustriesPage': 'src/pages/Industries/Industries.tsx',
  'InsightsPage': 'src/pages/Insights/Insights.tsx',
  'TestimonialsPage': 'src/pages/Testimonials/Testimonials.tsx',
  'FaqsPage': 'src/pages/Faqs/Faqs.tsx',
  'ResourcesPage': 'src/pages/Resources/Resources.tsx',
  'BlogsPage': 'src/pages/Blogs/Blogs.tsx',
  'CareersPage': 'src/pages/Careers/Careers.tsx',
  'ContactPage': 'src/pages/Contact/Contact.tsx',
  'BookPage': 'src/pages/Book/Book.tsx',
  'LoginPage': 'src/pages/Login/Login.tsx',
  'DashboardPage': 'src/pages/Dashboard/Dashboard.tsx',
  'AdminDashboardPage': 'src/pages/Admin/AdminDashboard.tsx',

  // App
  'App': 'src/App.tsx'
};

const fileContents = {};

// 1. Setup base files with original top-level imports
const importsText = sourceFile.getImportDeclarations().map(imp => imp.getText()).join('\n');
const originalImports = importsText;

// Helper to make sure directories exist
const ensureDir = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// 2. Extract declarations
for (const statement of sourceFile.getStatements()) {
  let name = null;
  let isExported = false;

  if (statement.isKind(SyntaxKind.VariableStatement)) {
    const decs = statement.getDeclarations();
    if (decs.length > 0) name = decs[0].getName();
  } else if (statement.isKind(SyntaxKind.FunctionDeclaration) || statement.isKind(SyntaxKind.InterfaceDeclaration) || statement.isKind(SyntaxKind.TypeAliasDeclaration)) {
    name = statement.getName();
  }

  if (!name || !mapping[name]) continue;

  const targetPath = mapping[name];
  if (!fileContents[targetPath]) {
    fileContents[targetPath] = [];
  }

  let text = statement.getText();
  
  // Make it exported if not already
  if (!statement.isExported() && name !== 'App') {
    text = 'export ' + text;
  }

  fileContents[targetPath].push({ name, text });
}

// 3. Generate initial files
for (const [targetPath, nodes] of Object.entries(fileContents)) {
  let content = originalImports + '\n\n';
  content += nodes.map(n => n.text).join('\n\n');
  if (targetPath === 'src/App.tsx') {
    content += '\n\nexport default App;\n';
  }
  ensureDir(targetPath);
  fs.writeFileSync(targetPath, content);
}

// 4. Add new files to a new TS project to fix imports
const newProject = new Project();
newProject.addSourceFilesAtPaths('src/**/*.ts*');

// Build a map of exported names to their file paths
const exportMap = {};
for (const [targetPath, nodes] of Object.entries(fileContents)) {
  for (const node of nodes) {
    exportMap[node.name] = targetPath;
  }
}

// Add imports for internal references
for (const [targetPath, nodes] of Object.entries(fileContents)) {
  const sf = newProject.getSourceFileOrThrow(targetPath);
  const usedIdentifiers = new Set();

  sf.forEachDescendant(node => {
    if (node.isKind(SyntaxKind.Identifier)) {
      usedIdentifiers.add(node.getText());
    }
  });

  const importsToAdd = {}; // filePath -> Set of names
  for (const ident of usedIdentifiers) {
    const sourcePath = exportMap[ident];
    if (sourcePath && sourcePath !== targetPath) {
      if (!importsToAdd[sourcePath]) importsToAdd[sourcePath] = new Set();
      importsToAdd[sourcePath].add(ident);
    }
  }

  for (const [sourcePath, idents] of Object.entries(importsToAdd)) {
    // Calculate relative path
    let relPath = path.relative(path.dirname(targetPath), sourcePath);
    if (!relPath.startsWith('.')) relPath = './' + relPath;
    relPath = relPath.replace(/\.tsx?$/, ''); // remove extension

    sf.addImportDeclaration({
      moduleSpecifier: relPath.replace(/\\/g, '/'),
      namedImports: Array.from(idents)
    });
  }

  // Optimize standard imports (React, Lucide)
  // This is a naive cleanup - only keep used imports from lucide-react
  const lucideImports = sf.getImportDeclaration(decl => decl.getModuleSpecifierValue() === 'lucide-react');
  if (lucideImports) {
    const namedImports = lucideImports.getNamedImports();
    for (const namedImport of namedImports) {
      const name = namedImport.getName();
      // Wait, let's just let ESLint/TS handle unused imports, or we can remove them if not used.
      if (!usedIdentifiers.has(name)) {
         namedImport.remove();
      }
    }
    if (lucideImports.getNamedImports().length === 0) {
      lucideImports.remove();
    }
  }

  sf.saveSync();
}

console.log("Refactoring complete.");
