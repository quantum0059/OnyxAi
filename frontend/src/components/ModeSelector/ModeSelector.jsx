import { AGENT_MODES } from '../../config/agentModes';
import { useChatContext } from '../../contexts/ChatContext';

/**
 * Interactive Mode Switcher component for toggling between AI Agent modes:
 * - Normal Chat
 * - Coding Agent
 * - PPT Agent
 * - PDF Mode
 * - Searching Mode
 *
 * @param {{ className?: string, compact?: boolean }} props
 */
export const ModeSelector = ({ className = '', compact = false }) => {
    const { activeMode, setActiveMode } = useChatContext();

    return (
        <div
            className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 select-none ${className}`}
            role="tablist"
            aria-label="AI Agent Modes"
        >
            {AGENT_MODES.map((mode) => {
                const isActive = mode.id === activeMode;
                const Icon = mode.icon;
                const { theme } = mode;

                return (
                    <button
                        key={mode.id}
                        role="tab"
                        aria-selected={isActive}
                        aria-label={`Switch to ${mode.label}: ${mode.description}`}
                        title={`${mode.label} — ${mode.description}`}
                        onClick={() => setActiveMode(mode.id)}
                        className={`
                            group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium
                            transition-all duration-200 cursor-pointer shrink-0 border
                            ${isActive
                                ? `${theme.bg} ${theme.border} ${theme.text} shadow-xs scale-[1.02]`
                                : 'bg-[#18191E] border-white/[0.06] text-[#8E929E] hover:text-[#D1D5DB] hover:border-white/[0.12] hover:bg-[#202127]'
                            }
                        `}
                    >
                        {/* Status indicator dot when active */}
                        {isActive && (
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${theme.dot} shrink-0 animate-pulse`}
                                aria-hidden="true"
                            />
                        )}

                        <Icon
                            size={14}
                            className={`shrink-0 transition-transform duration-150 ${
                                isActive ? theme.text : 'text-text-muted group-hover:text-text-primary'
                            }`}
                        />

                        <span className="truncate">
                            {compact ? mode.shortLabel : mode.label}
                        </span>

                        {/* Badge for extra clarity */}
                        {isActive && mode.badge && (
                            <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono hidden sm:inline-block ${theme.bg} ${theme.text} border ${theme.border}`}
                            >
                                {mode.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default ModeSelector;

