
import React from 'react';
import { ModeToggle} from './DakrMoodToggle';
export function Menu() {
  return (
    <nav className="menu">

      <ul className={'ul-style'}>
        <li className={'li-style'}>Portfolio</li>
        <li className={'li-style'}>About</li>
        <li className={'li-style'}>Contact</li>
        <li className={'li-style'}>Search</li>
        <li><ModeToggle /></li>
      </ul>

    </nav>
  );
}
