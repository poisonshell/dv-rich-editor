import React from 'react';
import type { EditorInstance } from '../../types';

export const EditorReactContext = React.createContext<EditorInstance | null>(null);

export default EditorReactContext;