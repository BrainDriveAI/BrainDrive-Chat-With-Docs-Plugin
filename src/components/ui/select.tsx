import * as React from "react"
import { ChevronDownIcon, CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectContextType {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
}

const SelectContext = React.createContext<SelectContextType>({
  open: false,
  setOpen: () => {},
});

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

interface SelectState {
  open: boolean;
}

class Select extends React.Component<SelectProps, SelectState> {
  constructor(props: SelectProps) {
    super(props);
    this.state = {
      open: false,
    };
  }

  setOpen = (open: boolean) => {
    if (!this.props.disabled) {
      this.setState({ open });
    }
  };

  render() {
    const { value, onValueChange, disabled, children } = this.props;
    const { open } = this.state;

    return (
      <SelectContext.Provider value={{ value, onValueChange, open, setOpen: this.setOpen, disabled }}>
        <div data-slot="select" className="relative">
          {children}
        </div>
      </SelectContext.Provider>
    );
  }
}

interface SelectTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "default";
  children: React.ReactNode;
}

class SelectTrigger extends React.Component<SelectTriggerProps> {
  static contextType = SelectContext;
  declare context: React.ContextType<typeof SelectContext>;

  handleClick = () => {
    if (!this.context.disabled) {
      this.context.setOpen(!this.context.open);
    }
  };

  render() {
    const { className, size = "default", children, ...props } = this.props;
    const { disabled } = this.context;

    return (
      <button
        type="button"
        data-slot="select-trigger"
        data-size={size}
        className={cn(
          "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          size === "default" && "h-9",
          size === "sm" && "h-8",
          className
        )}
        onClick={this.handleClick}
        disabled={disabled}
        {...props}
      >
        {children}
        <ChevronDownIcon className="size-4 opacity-50" />
      </button>
    );
  }
}

interface SelectValueProps {
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}

class SelectValue extends React.Component<SelectValueProps> {
  static contextType = SelectContext;
  declare context: React.ContextType<typeof SelectContext>;

  render() {
    const { placeholder, className, children } = this.props;
    const { value } = this.context;

    if (!value) {
      return <span data-slot="select-value" data-placeholder className={className}>{placeholder}</span>;
    }

    // If children are provided, render them; otherwise fall back to value
    return <span data-slot="select-value" className={className}>{children || value}</span>;
  }
}

interface SelectContentProps {
  className?: string;
  children: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
}

interface SelectContentState {
  searchQuery: string;
}

class SelectContent extends React.Component<SelectContentProps, SelectContentState> {
  static contextType = SelectContext;
  declare context: React.ContextType<typeof SelectContext>;
  private contentRef = React.createRef<HTMLDivElement>();
  private searchInputRef = React.createRef<HTMLInputElement>();

  constructor(props: SelectContentProps) {
    super(props);
    this.state = {
      searchQuery: '',
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
    // Auto-focus search input when searchable
    if (this.props.searchable && this.searchInputRef.current) {
      setTimeout(() => {
        this.searchInputRef.current?.focus();
      }, 100);
    }
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  componentDidUpdate(prevProps: SelectContentProps) {
    // Focus search when dropdown opens
    if (!prevProps.searchable && this.props.searchable && this.searchInputRef.current) {
      this.searchInputRef.current.focus();
    }

    // Clear search when dropdown closes
    if (prevProps.searchable && !this.context.open && this.state.searchQuery) {
      this.setState({ searchQuery: '' });
    }
  }

  handleClickOutside = (event: MouseEvent) => {
    if (this.contentRef.current && !this.contentRef.current.contains(event.target as Node)) {
      this.context.setOpen(false);
      this.setState({ searchQuery: '' });
    }
  };

  handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    this.setState({ searchQuery: query });
    if (this.props.onSearchChange) {
      this.props.onSearchChange(query);
    }
  };

  handleSearchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  render() {
    const { className, children, searchable, searchPlaceholder = "Search..." } = this.props;
    const { open } = this.context;
    const { searchQuery } = this.state;

    if (!open) return null;

    return (
      <div
        ref={this.contentRef}
        data-slot="select-content"
        className={cn(
          "bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full min-w-[8rem] rounded-md border shadow-md flex flex-col",
          className
        )}
      >
        {searchable && (
          <div className="p-2 border-b" onClick={this.handleSearchClick}>
            <input
              ref={this.searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={this.handleSearchChange}
              className="w-full px-2 py-1.5 text-sm border rounded outline-none focus:ring-1 focus:ring-blue-500"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-color)',
              }}
            />
          </div>
        )}
        <div className="p-1 overflow-auto flex-1">
          {children}
        </div>
      </div>
    );
  }
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

class SelectItem extends React.Component<SelectItemProps> {
  static contextType = SelectContext;
  declare context: React.ContextType<typeof SelectContext>;

  handleClick = () => {
    if (!this.props.disabled && this.context.onValueChange) {
      this.context.onValueChange(this.props.value);
      this.context.setOpen(false);
    }
  };

  render() {
    const { value, children, className, disabled } = this.props;
    const { value: selectedValue } = this.context;
    const isSelected = value === selectedValue;

    return (
      <div
        data-slot="select-item"
        className={cn(
          "focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        onClick={this.handleClick}
      >
        {isSelected && (
          <span className="absolute right-2 flex size-3.5 items-center justify-center">
            <CheckIcon className="size-4" />
          </span>
        )}
        {children}
      </div>
    );
  }
}

// Placeholder components for compatibility
class SelectGroup extends React.Component<{ children: React.ReactNode }> {
  render() {
    return <div data-slot="select-group">{this.props.children}</div>;
  }
}

class SelectLabel extends React.Component<{ children: React.ReactNode; className?: string }> {
  render() {
    const { children, className } = this.props;
    return (
      <div data-slot="select-label" className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}>
        {children}
      </div>
    );
  }
}

class SelectSeparator extends React.Component<{ className?: string }> {
  render() {
    return (
      <div data-slot="select-separator" className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", this.props.className)} />
    );
  }
}

// These are not needed in simplified version but exported for compatibility
const SelectScrollUpButton = () => null;
const SelectScrollDownButton = () => null;

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
