/**
 * Design kit: shadcn primitives (src/components/ui: Button, Card, Badge, Alert, ...) plus app pieces (Meter, CoinStack, ...), guardrails
 * (SimBanner, RangeDisplay, FanChart, AssumptionsDrawer), icons.
 * Owner: P4
 */

// The design kit proper, on the shadcn primitives in src/components/ui.
export { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
export { Badge } from './Badge';
export { Button } from '@/components/ui/button';
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
export { AssumptionsDrawer, type AssumptionsDrawerProps } from './AssumptionsDrawer';
export { FanChart, type FanChartProps } from './FanChart';
export { RangeDisplay, type RangeDisplayProps } from './RangeDisplay';
export { BottomSheet, CoinStack, Dialog, LockedTile, Meter, Toast } from './kit';
export { LanguageSwitcher } from './LanguageSwitcher';
export { Pager, type PagerPage } from './Pager';
export { SimBanner } from './SimBanner';
export { CheckIcon, ChevronIcon } from './icons';

// Reading aloud (P3), the shared icon set (P5), and Paisapur's pixel pieces (P2).
export { AudioButton } from './AudioButton';
export { Icon, type IconName } from './Icon';
export { Notice, ProgressBar, SectionLabel, Spinner } from './components';
export { Confetti } from './Confetti';
export { TopNav } from './TopNav';
export { Mascot, MascotFace } from './Mascot';
export { PixelButton, PixelOption, PixelPanel, PixelProgress } from './pixel';
export * from './tiles';
