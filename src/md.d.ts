// Enable TypeScript to support importing *.md files
declare module '*.md' {
  const content: string;
  export default content;
}

