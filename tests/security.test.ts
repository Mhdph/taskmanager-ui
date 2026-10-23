import { describe, expect, it, vi } from 'vitest';
import { labelFromApi, teamFromApi } from '../src/lib/adapter';
import { teamsGrid } from '../src/pages/members';
import { lbl } from '../src/ui/helpers';
import { LB } from '../src/core/constants';
import { S } from '../src/core/store';

vi.mock('virtual:icons', () => ({ ICONS: {} }));

describe('untrusted workspace rendering', () => {
  it('renders team HTML as text', () => {
    const previous = S.data.teams;
    const attack = '<img src=x onerror=alert(1)>';
    try {
      S.data.teams = [teamFromApi({ id: 'team-1', name: attack, description: attack })];
      const html = teamsGrid();
      expect(html).not.toContain(attack);
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    } finally {
      S.data.teams = previous;
    }
  });

  it('escapes labels and rejects CSS/attribute injection from API colors', () => {
    const attack = '"><img src=x onerror=alert(1)>';
    const label = labelFromApi({ id: 'unsafe', name: attack, color: attack });
    LB.unsafe = label as any;
    try {
      expect(lbl('unsafe')).not.toContain('<img');
      expect(label.c).not.toContain(attack);
      expect(teamFromApi({ id: 't1', color: 'red;background:url(https://attacker.test)' }).c).toBe('#8A867E');
      expect(teamFromApi({ id: 't1', color: '#ABCDEF' }).c).toBe('#ABCDEF');
    } finally {
      delete LB.unsafe;
    }
  });
});
