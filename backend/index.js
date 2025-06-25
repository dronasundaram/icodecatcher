import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { parseDocument } from 'htmlparser2';
import postcss from 'postcss';
import safeParser from 'postcss-safe-parser';
import cors from 'cors';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());

app.post('/upload', upload.fields([{ name: 'html' }, { name: 'css' }]), async (req, res) => {
  const htmlFile = req.files['html'][0];
  const cssFile = req.files['css'][0];

  const htmlContent = fs.readFileSync(htmlFile.path, 'utf-8');
  const cssContent = fs.readFileSync(cssFile.path, 'utf-8');

  const htmlIssues = parseHTML(htmlContent);
  const cssIssues = await parseCSS(cssContent);

  fs.unlinkSync(htmlFile.path);
  fs.unlinkSync(cssFile.path);

  res.json({ htmlIssues, cssIssues });
});

function parseHTML(content) {
  const doc = parseDocument(content);
  const issues = [];
  const traverse = (node) => {
    if (!node) return;
    if (node.type === 'tag') {
      if (node.name === 'img' && !node.attribs?.alt) {
        issues.push({ type: 'Missing alt attribute', tag: '<img>' });
      }
      if (node.name === 'html' && !node.attribs?.lang) {
        issues.push({ type: 'Missing lang attribute', tag: '<html>' });
      }
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  };
  traverse(doc);
  return issues;
}

async function parseCSS(content) {
  const issues = [];
  const root = await postcss().process(content, { parser: safeParser }).then(result => result.root);
  root.walkDecls(decl => {
    if (decl.value.includes('0px')) {
      issues.push({ property: decl.prop, problem: 'Use 0 instead of 0px' });
    }
    if (decl.prop.startsWith('font-')) {
      issues.push({ property: decl.prop, problem: 'Consider using font shorthand' });
    }
    if (decl.prop.startsWith('background-')) {
      issues.push({ property: decl.prop, problem: 'Consider using background shorthand' });
    }
    if (decl.value.includes('!important')) {
      issues.push({ property: decl.prop, problem: 'Avoid using !important unless necessary' });
    }
  });
  return issues;
}

app.listen(5001, () => console.log('Backend running on http://localhost:5001'));
