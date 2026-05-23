export interface StandardNode {
  id: string;
  label: string;
  status: 'abolished' | 'current' | 'history';
  x?: number;
  y?: number;
}

export interface StandardLink {
  source: string;
  target: string;
  type: 'direct' | 'indirect';
}

export interface MetadataField {
  label: string;
  value: string;
  highlight?: boolean;
}
