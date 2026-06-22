import { useGame } from './hooks/useGame';
import { useOpponents, useItems } from './hooks/useOpponents';
import { NameEntryScreen } from './components/screens/NameEntryScreen';
import { OpponentSelectScreen } from './components/screens/OpponentSelectScreen';
import { BattleScreen } from './components/screens/BattleScreen';
import { RewardScreen } from './components/screens/RewardScreen';
import { ShopScreen } from './components/screens/ShopScreen';

function App() {
  const { state, dispatch } = useGame();
  const { opponents, loading } = useOpponents();
  const { items } = useItems();

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-base flex items-center justify-center">
        <span className="font-pixel text-text-muted text-xs">Loading...</span>
      </div>
    );
  }

  switch (state.screen) {
    case 'name_entry':
      return <NameEntryScreen dispatch={dispatch} />;

    case 'battle':
      if (!state.activeBattle) return null;
      return (
        <BattleScreen
          initialBattleState={state.activeBattle}
          opponents={opponents}
          gameDispatch={dispatch}
        />
      );

    case 'reward':
      return <RewardScreen gameState={state} dispatch={dispatch} shopItems={items} />;

    case 'shop':
      return <ShopScreen gameState={state} dispatch={dispatch} />;

    case 'opponent_select':
    default:
      return <OpponentSelectScreen gameState={state} dispatch={dispatch} opponents={opponents} />;
  }
}

export default App;
