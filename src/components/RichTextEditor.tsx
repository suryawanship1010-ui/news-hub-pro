import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Strikethrough, List, ListOrdered, Quote, Heading1, Heading2,
  Heading3, Link as LinkIcon, Image as ImageIcon, Undo2, Redo2, Code,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder = "Start writing your story…" }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noreferrer noopener", target: "_blank" } }),
      Image,
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "tiptap prose prose-sm max-w-none focus:outline-none" },
    },
  });

  if (!editor) {
    return <div className="min-h-[360px] rounded-md border border-input bg-background p-4 text-sm text-muted-foreground">Loading editor…</div>;
  }

  const Tool = ({ onClick, active, children, label }: { onClick: () => void; active?: boolean; children: React.ReactNode; label: string }) => (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} aria-label={label}
      className={cn("h-8 w-8 p-0", active && "bg-accent text-accent-foreground")}>{children}</Button>
  );

  const addLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt("Image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="rounded-md border border-input bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
        <Tool onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} label="H1"><Heading1 className="h-4 w-4" /></Tool>
        <Tool onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="H2"><Heading2 className="h-4 w-4" /></Tool>
        <Tool onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} label="H3"><Heading3 className="h-4 w-4" /></Tool>
        <div className="mx-1 h-6 w-px bg-border" />
        <Tool onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="Bold"><Bold className="h-4 w-4" /></Tool>
        <Tool onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="Italic"><Italic className="h-4 w-4" /></Tool>
        <Tool onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} label="Strike"><Strikethrough className="h-4 w-4" /></Tool>
        <Tool onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} label="Code"><Code className="h-4 w-4" /></Tool>
        <div className="mx-1 h-6 w-px bg-border" />
        <Tool onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="Bullet list"><List className="h-4 w-4" /></Tool>
        <Tool onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="Ordered list"><ListOrdered className="h-4 w-4" /></Tool>
        <Tool onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label="Quote"><Quote className="h-4 w-4" /></Tool>
        <div className="mx-1 h-6 w-px bg-border" />
        <Tool onClick={addLink} active={editor.isActive("link")} label="Link"><LinkIcon className="h-4 w-4" /></Tool>
        <Tool onClick={addImage} label="Image"><ImageIcon className="h-4 w-4" /></Tool>
        <div className="mx-1 h-6 w-px bg-border" />
        <Tool onClick={() => editor.chain().focus().undo().run()} label="Undo"><Undo2 className="h-4 w-4" /></Tool>
        <Tool onClick={() => editor.chain().focus().redo().run()} label="Redo"><Redo2 className="h-4 w-4" /></Tool>
      </div>
      <div className="p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
