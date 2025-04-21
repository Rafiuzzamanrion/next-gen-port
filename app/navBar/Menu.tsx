
import React from 'react';
import { ModeToggle} from './DakrMoodToggle';
import Link from "next/link";
export function Menu() {
  return (
    <nav className="menu">

      <ul className={'ul-style'}>
        <li className={'li-style'}> <Link href={'#home'}>Home</Link> </li>
        <li className={'li-style'}><Link href={'#about'}>About</Link></li>
        <li className={'li-style'}><Link href={'#skill'}>Skill</Link></li>
        <li className={'li-style'}><Link href={'#project'}>Project</Link></li>
        <li className={'li-style'}><Link href={'#contact'}>Contact</Link></li>
        <li><ModeToggle /></li>
      </ul>

    </nav>
  );
}
