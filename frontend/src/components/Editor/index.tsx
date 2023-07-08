import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Color } from '@tiptap/extension-color';
import History from '@tiptap/extension-history';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Heading from '@tiptap/extension-heading';
import Mention from '@tiptap/extension-mention';
import TrackTimeStamp from '../Extensions/Custom/TimeStamp';
import suggestion from '../Extensions/Custom/Speakers/Suggestion';

function Editor() {
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      History,
      HorizontalRule,
      Heading,
      Color,
      Mention.configure({
        HTMLAttributes: {
          class:
            'border-black rounded-md break-clone py-0.5 px-1.5 p-1 bg-blue-500 text-white',
        },
        suggestion,
      }),
      TrackTimeStamp,
    ],
    content:
      localStorage.getItem('document') ??
      '<p>123</p>',
    onTransaction: (editor) => {
      localStorage.setItem('document', editor.editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `rounded-lg min-w-full h-full min-h-screen prose sm:prose-base lg:prose-lg focus:outline-none`
      },
    },
    autofocus: true,
  });

  React.useEffect(() => {
    console.log(editor?.getHTML());
  }, [editor])

  return <EditorContent className="w-full" editor={editor} />;
}

export default Editor;
