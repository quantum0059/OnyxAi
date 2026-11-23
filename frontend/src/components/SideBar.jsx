import { useState, useRef, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    HiOutlinePencilSquare,
    HiOutlineChatBubbleLeftRight,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineMagnifyingGlass,
    HiOutlineEllipsisHorizontal,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineArrowRightOnRectangle,
    HiOutlineCog6Tooth,
    HiOutlineXMark,
    HiOutlineSparkles,
    HiOutlineCheck,
    HiOutlineArrowUpCircle,
} from 'react-icons/hi2';
import { signOut } from 'firebase/auth';
import { auth } from '../../utils/firebase';
import { setUserData } from '../redux/userSlice';
import {
    setConversations,
    addConversation,
    setCurrentConversation,
    updateConversationTitle,
    deleteConversation,
    setConversationLoading,
    clearConversations,
} from '../redux/conversationSlice';
import { createConversation } from '../features/createConversation';
import { getConversations } from '../features/getConversation';
import { getConversationMessages } from '../features/getConversationMessages';
import { updateConversation } from '../features/updateConversation';
import { useChatContext } from '../contexts/ChatContext';
import { DEFAULT_MODE_ID } from '../config/agentModes';
import api from '../../utils/axios';
import UpgradePlanModal from './UpgradePlanModal';

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */
const COLLAPSED_W = 56;   // px — icon rail width
const EXPANDED_W  = 256;  // px — full sidebar width

/* ─────────────────────────────────────────────
   Helpers: Categorize date (Today, Yesterday, etc.)
   ───────────────────────────────────────────── */
const getCategoryForDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return 'Previous 7 days';
    return 'Older';
};

const groupConversationsByDate = (items) =>
    items.reduce((acc, item) => {
        const cat = getCategoryForDate(item.createdAt || item.updatedAt);
        (acc[cat] = acc[cat] || []).push(item);
        return acc;
    }, {});

/* ─────────────────────────────────────────────
   UserAvatar — reused in footer + collapsed rail
   ───────────────────────────────────────────── */
const UserAvatar = ({ userData, size = 'sm' }) => {
    const dim = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm';
    if (userData?.avatar) {
        return (
            <img
                src={userData.avatar}
                alt={userData.name ?? 'User avatar'}
                className={`${dim} rounded-full ring-1 ring-white/10 shrink-0 object-cover`}
            />
        );
    }
    return (
        <div className={`${dim} rounded-full bg-[#262626] border border-white/10 flex items-center justify-center font-medium text-text-primary shrink-0`}>
            {userData?.name?.[0]?.toUpperCase() ?? 'U'}
        </div>
    );
};

/* ─────────────────────────────────────────────
   HistorySkeleton
   ───────────────────────────────────────────── */
const HistorySkeleton = () => (
    <div className="px-2 py-1 space-y-1 animate-pulse" aria-hidden="true">
        {[80, 60, 90, 70].map((w, i) => (
            <div
                key={i}
                className="h-8 rounded-lg bg-border-muted"
                style={{ width: `${w}%` }}
            />
        ))}
    </div>
);

/* ─────────────────────────────────────────────
   HistoryItem — with inline rename & hover options
   ───────────────────────────────────────────── */
const HistoryItem = ({ item, isActive, onSelect, onRename, onDelete }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(item.title || 'Untitled Chat');
    const menuRef = useRef(null);
    const inputRef = useRef(null);

    const itemId = item._id || item.id;
    const itemTitle = item.title || 'Untitled Chat';

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing) {
            setEditTitle(itemTitle);
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing, itemTitle]);

    // Close menu when clicking outside
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e) => {
            if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    const handleSaveRename = (e) => {
        e?.stopPropagation?.();
        const trimmed = editTitle.trim();
        if (trimmed && trimmed !== itemTitle) {
            onRename(itemId, trimmed);
        }
        setIsEditing(false);
        setMenuOpen(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSaveRename(e);
        } else if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };

    return (
        <div
            className={`
                group relative flex items-center rounded-lg cursor-pointer
                transition-colors duration-150
                ${isActive
                    ? 'bg-accent-subtle text-text-primary'
                    : 'text-text-secondary hover:bg-border-subtle hover:text-text-primary'
                }
            `}
            onClick={() => !isEditing && onSelect(itemId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && !isEditing && onSelect(itemId)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`Chat: ${itemTitle}`}
        >
            {/* Active left-accent bar */}
            {isActive && (
                <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-accent"
                    aria-hidden="true"
                />
            )}

            <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2">
                <HiOutlineChatBubbleLeftRight size={14} className="shrink-0 opacity-70" />
                {isEditing ? (
                    <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-elevated border border-accent rounded px-1.5 py-0.5 text-[12px] text-text-primary outline-none"
                        />
                        <button
                            onClick={handleSaveRename}
                            className="p-1 text-accent hover:text-accent-hover cursor-pointer"
                            aria-label="Save title"
                        >
                            <HiOutlineCheck size={13} />
                        </button>
                    </div>
                ) : (
                    <span className="truncate text-[13px] leading-snug">{itemTitle}</span>
                )}
            </div>

            {/* "⋯" menu trigger — only shown on hover/active */}
            {!isEditing && (
                <div className="relative shrink-0 pr-1.5" ref={menuRef}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen((o) => !o);
                        }}
                        aria-label={`Options for ${itemTitle}`}
                        aria-expanded={menuOpen}
                        className={`
                            p-1 rounded-md transition-all duration-150 cursor-pointer
                            text-text-muted hover:text-text-primary hover:bg-border-muted
                            ${menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}
                        `}
                    >
                        <HiOutlineEllipsisHorizontal size={15} />
                    </button>

                    {/* Dropdown menu */}
                    {menuOpen && (
                        <div
                            className="absolute right-0 top-full mt-1 z-50 w-36 bg-overlay border border-border-muted rounded-xl shadow-xl py-1 overflow-hidden"
                            role="menu"
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                    setMenuOpen(false);
                                }}
                                role="menuitem"
                                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary hover:bg-border-subtle transition-colors cursor-pointer"
                            >
                                <HiOutlinePencil size={13} />
                                Rename
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpen(false);
                                    onDelete(itemId);
                                }}
                                role="menuitem"
                                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-danger hover:bg-danger-subtle transition-colors cursor-pointer"
                            >
                                <HiOutlineTrash size={13} />
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   UserDropdown — click-outside aware
   ───────────────────────────────────────────── */
const UserDropdown = ({ userData, onLogout, onOpenUpgrade, onClose }) => {
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (!ref.current?.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="absolute bottom-full left-2 right-2 mb-2 z-50 bg-overlay border border-border-muted rounded-xl shadow-2xl py-1 overflow-hidden"
            role="menu"
        >
            {/* Identity row */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border-subtle">
                <UserAvatar userData={userData} />
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-text-primary truncate leading-snug">
                        {userData.name}
                    </p>
                    <p className="text-[11px] text-text-muted truncate">{userData.email}</p>
                </div>
            </div>

            {/* Actions */}
            <button
                role="menuitem"
                onClick={() => {
                    onClose();
                    onOpenUpgrade?.();
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-text-primary hover:bg-border-subtle transition-colors cursor-pointer group/up"
            >
                <div className="flex items-center gap-2.5">
                    <HiOutlineSparkles size={15} className="text-text-primary" />
                    <span>Upgrade plan</span>
                </div>
                <span className="text-[10px] font-semibold bg-white/[0.08] text-[#A1A1AA] border border-white/[0.1] px-2 py-0.5 rounded-full">
                    Pro
                </span>
            </button>
            <button
                role="menuitem"
                onClick={onClose}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary hover:bg-border-subtle transition-colors cursor-pointer"
            >
                <HiOutlineCog6Tooth size={15} />
                Settings
            </button>
            <button
                role="menuitem"
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-danger hover:bg-danger-subtle transition-colors cursor-pointer"
            >
                <HiOutlineArrowRightOnRectangle size={15} />
                Sign out
            </button>
        </div>
    );
};

/* ─────────────────────────────────────────────
   SideBar Component
   ───────────────────────────────────────────── */
const SideBar = () => {
    const { sidebarOpen, toggleSidebar, setMessages, setActiveMode } = useChatContext();
    const { userData } = useSelector((state) => state.user);
    const { conversations, currentConversationId, loading: historyLoading } = useSelector(
        (state) => state.conversations
    );
    const dispatch = useDispatch();

    const [query, setQuery] = useState('');
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

    // Fetch conversations from backend feature on user login
    useEffect(() => {
        if (!userData) return;
        let isMounted = true;

        const loadConversations = async () => {
            dispatch(setConversationLoading(true));
            const list = await getConversations();
            if (isMounted) {
                dispatch(setConversations(list));
            }
        };

        loadConversations();

        return () => {
            isMounted = false;
        };
    }, [userData, dispatch]);

    /* Live-filter history client-side */
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return conversations;
        return conversations.filter((c) =>
            (c.title || 'Untitled Chat').toLowerCase().includes(q)
        );
    }, [conversations, query]);

    const grouped = useMemo(() => groupConversationsByDate(filtered), [filtered]);

    /* Create New Chat */
    const handleNewChat = async () => {
        const newConvo = await createConversation();
        if (newConvo) {
            dispatch(addConversation(newConvo));
        } else {
            // Local fallback
            const localFallback = {
                _id: crypto.randomUUID(),
                title: 'New chat',
                createdAt: new Date().toISOString(),
            };
            dispatch(addConversation(localFallback));
        }
        setMessages([]);
        setActiveMode?.(DEFAULT_MODE_ID);
        setQuery('');
        if (window.innerWidth < 768 && sidebarOpen) {
            toggleSidebar();
        }
    };

    /* Select Existing Chat */
    const handleSelectChat = async (id) => {
        const selectedConvo = conversations.find((c) => (c._id || c.id) === id);
        dispatch(setCurrentConversation(selectedConvo || id));

        // Load conversation messages from backend
        const msgs = await getConversationMessages(id);
        const formatted = msgs
            .map((m) => ({
                id: m._id || m.id || crypto.randomUUID(),
                role: m.role || 'user',
                content: m.content || '',
                file: m.file || null,
                images: Array.isArray(m.images) ? m.images : [],
                artifacts: Array.isArray(m.artifacts) ? m.artifacts : [],
                timestamp: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
            }))
            .reverse(); // backend sorted { createdAt: -1 }

        setMessages(formatted);

        if (window.innerWidth < 768 && sidebarOpen) {
            toggleSidebar();
        }
    };

    /* Rename Chat */
    const handleRenameChat = async (id, newTitle) => {
        dispatch(updateConversationTitle({ id, title: newTitle }));
        await updateConversation({ id, title: newTitle });
    };

    /* Delete Chat */
    const handleDeleteChat = (id) => {
        dispatch(deleteConversation(id));
        if (currentConversationId === id) {
            setMessages([]);
        }
    };

    /* Logout */
    const handleLogout = async () => {
        setUserMenuOpen(false);
        try {
            await api.get('/api/auth/logout');
            await signOut(auth);
            dispatch(setUserData(null));
            dispatch(clearConversations());
            setMessages([]);
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {sidebarOpen && (
                <div
                    onClick={toggleSidebar}
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden transition-opacity duration-200 ease-out cursor-pointer"
                    aria-hidden="true"
                />
            )}

            {/* Desktop Collapsed Icon Rail */}
            {!sidebarOpen && (
                <aside
                    className="hidden md:flex fixed inset-y-0 left-0 z-30 flex-col items-center py-3 gap-2 bg-panel border-r border-border-subtle transition-all duration-200 ease-out"
                    style={{ width: COLLAPSED_W }}
                    aria-label="Collapsed sidebar"
                >
                    <div className="w-8 h-8 rounded-lg bg-accent-subtle border border-accent-border flex items-center justify-center mb-1">
                        <HiOutlineSparkles size={16} className="text-accent-hover" />
                    </div>

                    <button
                        onClick={toggleSidebar}
                        aria-label="Expand sidebar"
                        title="Expand sidebar"
                        className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-border-subtle transition-colors cursor-pointer"
                    >
                        <HiOutlineChevronRight size={17} />
                    </button>

                    <button
                        onClick={handleNewChat}
                        aria-label="New chat"
                        title="New chat"
                        className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-border-subtle transition-colors cursor-pointer"
                    >
                        <HiOutlinePencilSquare size={17} />
                    </button>

                    <div className="flex-1" />

                    {userData && (
                        <button
                            onClick={toggleSidebar}
                            aria-label="Open sidebar to access account"
                            title={userData.name}
                            className="cursor-pointer"
                        >
                            <UserAvatar userData={userData} />
                        </button>
                    )}
                </aside>
            )}

            {/* Main Sidebar / Mobile Drawer */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-40 flex flex-col bg-panel border-r border-border-subtle
                    transition-all duration-200 ease-out overflow-hidden shadow-2xl md:shadow-none
                    ${sidebarOpen
                        ? 'translate-x-0 w-72 md:w-64'
                        : '-translate-x-full md:-translate-x-full pointer-events-none'
                    }
                `}
                aria-label="Navigation sidebar"
                aria-hidden={!sidebarOpen}
            >
                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-3 pt-3 pb-2">
                    <span className="text-[13px] font-semibold text-text-primary tracking-tight pl-0.5">
                        OnyxAI
                    </span>
                    <button
                        onClick={toggleSidebar}
                        aria-label="Close sidebar"
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-border-subtle transition-colors cursor-pointer"
                    >
                        <HiOutlineChevronLeft size={16} />
                    </button>
                </div>

                {/* New Chat Button */}
                <div className="shrink-0 px-3 pb-3">
                    <button
                        onClick={handleNewChat}
                        aria-label="Start a new chat"
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-medium bg-[#212121] hover:bg-[#2A2A2A] text-text-primary border border-white/[0.08] hover:border-white/[0.14] transition-all duration-150 cursor-pointer active:scale-[0.98]"
                    >
                        <HiOutlinePencilSquare size={15} />
                        New chat
                    </button>
                </div>

                {/* Search */}
                <div className="shrink-0 px-3 pb-2">
                    <div className="relative flex items-center">
                        <HiOutlineMagnifyingGlass
                            size={14}
                            className="absolute left-2.5 text-text-muted pointer-events-none"
                        />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search chats…"
                            aria-label="Search chat history"
                            className="w-full bg-elevated border border-border-subtle rounded-lg pl-8 pr-7 py-1.5 text-[12px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border transition-colors duration-150"
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                aria-label="Clear search"
                                className="absolute right-2 text-text-muted hover:text-text-primary cursor-pointer"
                            >
                                <HiOutlineXMark size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* History List */}
                <nav className="flex-1 overflow-y-auto px-2 pb-2" aria-label="Chat history">
                    {historyLoading ? (
                        <HistorySkeleton />
                    ) : filtered.length === 0 ? (
                        <p className="px-3 py-4 text-[12px] text-text-muted text-center">
                            {query ? 'No chats found.' : 'No conversations yet.'}
                        </p>
                    ) : (
                        Object.entries(grouped).map(([date, items]) => (
                            <div key={date} className="mb-3">
                                <p className="px-2 pt-2 pb-1 text-[10px] font-semibold text-text-disabled uppercase tracking-widest">
                                    {date}
                                </p>
                                <div className="space-y-0.5">
                                    {items.map((item) => {
                                        const id = item._id || item.id;
                                        return (
                                            <HistoryItem
                                                key={id}
                                                item={item}
                                                isActive={currentConversationId === id}
                                                onSelect={handleSelectChat}
                                                onRename={handleRenameChat}
                                                onDelete={handleDeleteChat}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </nav>

                {/* User Profile Footer */}
                {userData && (
                    <div className="shrink-0 px-2 pb-3 pt-2 border-t border-border-subtle relative">
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setUserMenuOpen((o) => !o)}
                                aria-label="Open account menu"
                                aria-expanded={userMenuOpen}
                                aria-haspopup="menu"
                                className="flex-1 min-w-0 flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-border-subtle transition-colors cursor-pointer group"
                            >
                                <UserAvatar userData={userData} />
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-[13px] font-medium text-text-primary truncate leading-tight">
                                        {userData.name}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-white/[0.08] text-[#A1A1AA] border border-white/[0.1]">
                                            {userData.plan || 'Free'}
                                        </span>
                                        <span className="text-[11px] text-text-muted truncate">
                                            • {userData.credits ?? 100} credits
                                        </span>
                                    </div>
                                </div>
                                <HiOutlineEllipsisHorizontal
                                    size={16}
                                    className="shrink-0 text-text-muted opacity-80 group-hover:opacity-100 transition-opacity"
                                />
                            </button>

                            {/* Direct Upgrade button next to user profile (matches ChatGPT screenshot) */}
                            <button
                                onClick={() => setUpgradeModalOpen(true)}
                                aria-label="Upgrade plan"
                                title="Upgrade plan"
                                className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#1F1F1F] hover:bg-[#2A2A2A] hover:text-white text-[#A1A1AA] border border-white/[0.08] transition-all duration-150 cursor-pointer shrink-0"
                            >
                                Upgrade
                            </button>
                        </div>

                        {userMenuOpen && (
                            <UserDropdown
                                userData={userData}
                                onLogout={handleLogout}
                                onOpenUpgrade={() => setUpgradeModalOpen(true)}
                                onClose={() => setUserMenuOpen(false)}
                            />
                        )}
                    </div>
                )}
            </aside>

            {/* Upgrade Plan Modal / Drawer */}
            <UpgradePlanModal
                isOpen={upgradeModalOpen}
                onClose={() => setUpgradeModalOpen(false)}
            />
        </>
    );
};

export default SideBar;
