import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('./src/app/App.tsx');

const declarations = [];

// Get all top-level statements
for (const statement of sourceFile.getStatements()) {
  let name = 'UNKNOWN';
  let type = SyntaxKind[statement.getKind()];

  if (statement.isKind(SyntaxKind.VariableStatement)) {
    const decs = statement.getDeclarations();
    if (decs.length > 0) {
      name = decs[0].getName();
    }
  } else if (statement.isKind(SyntaxKind.FunctionDeclaration)) {
    name = statement.getName() || 'anonymous';
  } else if (statement.isKind(SyntaxKind.InterfaceDeclaration) || statement.isKind(SyntaxKind.TypeAliasDeclaration)) {
    name = statement.getName();
  }

  declarations.push({
    type,
    name,
    startLine: statement.getStartLineNumber(),
    endLine: statement.getEndLineNumber(),
  });
}

fs.writeFileSync('declarations.json', JSON.stringify(declarations, null, 2));
console.log('Done writing declarations.json');
