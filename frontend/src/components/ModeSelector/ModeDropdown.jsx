import { useState, useRef, useEffect } from 'react';
import { HiOutlineChevronDown, HiOutlineCheck } from 'react-icons/hi2';
import { AGENT_MODES } from '../../config/agentModes';
import { useChatContext } from '../../contexts/ChatContext';

/**
 * Dropdown variant of the Mode Selector, ideal for TopBar or compact headers.
 * @param {{ className?: string }} props
 */
export const ModeDropdown = ({ className = '' }) => {
    const { activeMode, setActiveMode, currentModeConfig } = useChatContext();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const CurrentIcon = currentModeConfig.icon;
    const { theme } = currentModeConfig;

    // Close on outside click or escape
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border
                    shadow-sm transition-all duration-200 cursor-pointer
                    ${theme.bg} ${theme.border} ${theme.text} hover:opacity-90
                `}
                aria-label={`Current Mode: ${currentModeConfig.label}. Click to switch mode.`}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <CurrentIcon size={14} className="shrink-0" />
                <span className="truncate max-w-[110px] sm:max-w-[140px]">
                    {currentModeConfig.shortLabel}
                </span>
                <HiOutlineChevronDown
                    size={12}
                    className={`text-text-muted transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {isOpen && (
                <div
                    className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-1.5 w-72 bg-overlay border border-border-muted rounded-xl shadow-2xl p-1.5 z-50 animate-fade-up"
                    role="listbox"
                    aria-label="Select AI Mode"
                >
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-text-disabled uppercase tracking-wider border-b border-border-subtle mb-1">
                        Select Agent Mode
                    </div>
                    <div className="space-y-0.5">
                        {AGENT_MODES.map((mode) => {
                            const isSelected = mode.id === activeMode;
                            const Icon = mode.icon;
                            const modeTheme = mode.theme;

                            return (
                                <button
                                    key={mode.id}
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                        setActiveMode(mode.id);
                                        setIsOpen(false);
                                    }}
                                    className={`
                                        w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-colors cursor-pointer
                                        ${isSelected
                                            ? `${modeTheme.bg} ${modeTheme.text}`
                                            : 'hover:bg-border-subtle text-text-secondary hover:text-text-primary'
                                        }
                                    `}
                                >
                                    <Icon
                                        size={16}
                                        className={`shrink-0 mt-0.5 ${
                                            isSelected ? modeTheme.text : 'text-text-muted'
                                        }`}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs font-semibold truncate">
                                                {mode.label}
                                            </span>
                                            {mode.badge && (
                                                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-border-muted text-text-muted shrink-0">
                                                    {mode.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                                            {mode.description}
                                        </p>
                                    </div>
                                    {isSelected && (
                                        <HiOutlineCheck size={14} className={`${modeTheme.text} shrink-0 mt-0.5`} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModeDropdown;

