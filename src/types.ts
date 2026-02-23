export enum Language {
  EN = 'en',
  ZH = 'zh',
}

export type Translation = {
  title: string;
  start: string;
  howToPlay: string;
  howToPlayDesc: string;
  score: string;
  ammo: string;
  victory: string;
  defeat: string;
  restart: string;
  nextRound: string;
  backToMenu: string;
  playAgain: string;
  clickToFire: string;
  touchToFire: string;
  finalScore: string;
  rocketsDestroyed: string;
  remainingAmmo: string;
  skillShield: string;
  skillFast: string;
  skillBig: string;
  skillMulti: string;
};

export enum PowerUpType {
  SHIELD = 'SHIELD',
  FAST_MISSILE = 'FAST_MISSILE',
  BIG_EXPLOSION = 'BIG_EXPLOSION',
  MULTI_SHOT = 'MULTI_SHOT',
}

export const translations: Record<Language, Translation> = {
  [Language.EN]: {
    title: 'Neo Nova Defense',
    start: 'Start Game',
    howToPlay: 'How to Play',
    howToPlayDesc: 'Protect the city from alien warships. Click or touch to fire interceptor missiles. Destroy ships with explosions. Collect power-ups to upgrade your defense!',
    score: 'Score',
    ammo: 'Ammo',
    victory: 'VICTORY!',
    defeat: 'GAME OVER',
    restart: 'Restart',
    nextRound: 'Next Round',
    backToMenu: 'Main Menu',
    playAgain: 'Play Again',
    clickToFire: 'Click to aim and fire',
    touchToFire: 'Touch to aim and fire',
    finalScore: 'Final Score',
    rocketsDestroyed: 'Ships Destroyed',
    remainingAmmo: 'Remaining Ammo',
    skillShield: 'SHIELD ACTIVE',
    skillFast: 'HYPER MISSILES',
    skillBig: 'MEGA BLAST',
    skillMulti: 'TRI-SHOT',
  },
  [Language.ZH]: {
    title: 'Neo地球防御',
    start: '开始游戏',
    howToPlay: '玩法说明',
    howToPlayDesc: '保卫城市免受外星战舰袭击。点击或触摸屏幕发射拦截导弹。利用爆炸摧毁敌舰。收集掉落的技能球来增强你的防御！',
    score: '得分',
    ammo: '弹药',
    victory: '胜利！',
    defeat: '游戏结束',
    restart: '重新开始',
    nextRound: '下一轮',
    backToMenu: '返回主菜单',
    playAgain: '再玩一次',
    clickToFire: '点击瞄准发射',
    touchToFire: '触摸瞄准发射',
    finalScore: '最终得分',
    rocketsDestroyed: '击毁战舰数',
    remainingAmmo: '剩余导弹数',
    skillShield: '防护罩开启',
    skillFast: '极速导弹',
    skillBig: '超级爆炸',
    skillMulti: '三连发',
  },
};

export interface Point {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  update(dt: number): boolean; // returns false if entity should be removed
  draw(ctx: CanvasRenderingContext2D): void;
}
