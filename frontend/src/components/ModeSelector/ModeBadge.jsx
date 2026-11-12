import { useChatContext } from '../../contexts/ChatContext';

/**
 * Renders a compact badge representing the active agent mode.
 * @param {{ size?: 'sm' | 'md', showDescription?: boolean, className?: string }} props
 */
export const ModeBadge = ({ size = 'sm', showDescription = false, className = '' }) => {
    const { currentModeConfig } = useChatContext();
    const Icon = currentModeConfig.icon;
    const { theme } = currentModeConfig;

    const sizeClasses = size === 'sm'
        ? 'px-2 py-0.5 text-[11px] gap-1.5'
        : 'px-2.5 py-1 text-xs gap-2';

    return (
        <div
            className={`
                inline-flex items-center rounded-lg border font-medium
                ${theme.bg} ${theme.border} ${theme.text} ${sizeClasses} ${className}
            `}
            role="status"
            aria-label={`Active mode: ${currentModeConfig.label}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${theme.dot} shrink-0 animate-pulse`} />
            <Icon size={size === 'sm' ? 13 : 15} className="shrink-0" />
            <span className="truncate">{currentModeConfig.shortLabel}</span>
            {showDescription && (
                <span className="text-text-muted font-normal hidden sm:inline truncate">
                    — {currentModeConfig.description}
                </span>
            )}
        </div>
    );
};

export default ModeBadge;

