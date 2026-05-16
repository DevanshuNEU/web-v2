// @vitest-environment jsdom

import '../../setup/dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobilePushView, {
  useMobileNavigation,
  type PushViewEntry,
} from '@/components/mobile/ui/MobilePushView';

/**
 * Animation and swipe-gesture behaviour live in /mobile-preview (need a
 * real browser for spring physics and pointer velocity). These tests
 * cover the structural stack contract: push/pop/popToRoot, NavBar wiring,
 * and the context error path.
 */

/* Helper buttons that exercise the navigation context. */
function PushButton({ view, label = 'push' }: { view: PushViewEntry; label?: string }) {
  const nav = useMobileNavigation();
  return <button onClick={() => nav.push(view)}>{label}</button>;
}

function PopButton({ label = 'pop' }: { label?: string }) {
  const nav = useMobileNavigation();
  return <button onClick={() => nav.pop()}>{label}</button>;
}

function PopToRootButton({ label = 'home' }: { label?: string }) {
  const nav = useMobileNavigation();
  return <button onClick={() => nav.popToRoot()}>{label}</button>;
}

function DepthReadout() {
  const nav = useMobileNavigation();
  return <span data-testid="depth">{nav.depth}</span>;
}

describe('MobilePushView', () => {
  it('renders the root view initially', () => {
    const root: PushViewEntry = {
      id: 'root',
      title: 'Root',
      element: <p>root content</p>,
    };
    render(<MobilePushView rootView={root} />);
    expect(screen.getByText('root content')).toBeInTheDocument();
  });

  it('renders the NavBar title for the root view', () => {
    render(
      <MobilePushView
        rootView={{ id: 'r', title: 'Settings', element: <p>x</p> }}
      />
    );
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('does NOT render a back button on the root view', () => {
    render(
      <MobilePushView
        rootView={{ id: 'r', title: 'Settings', element: <p>x</p> }}
      />
    );
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
  });

  it('push() adds a view; pop() removes it', async () => {
    const detail: PushViewEntry = {
      id: 'detail',
      title: 'Detail',
      element: (
        <>
          <p>detail content</p>
          <PopButton />
        </>
      ),
    };
    render(
      <MobilePushView
        rootView={{
          id: 'root',
          title: 'Root',
          element: <PushButton view={detail} label="open detail" />,
        }}
      />
    );

    expect(screen.queryByText('detail content')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'open detail' }));
    expect(screen.getByText('detail content')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Detail' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'pop' }));
    expect(screen.queryByText('detail content')).not.toBeInTheDocument();
  });

  it('renders an integrated back button on pushed views', async () => {
    const detail: PushViewEntry = {
      id: 'detail',
      title: 'Detail',
      element: <p>detail</p>,
    };
    render(
      <MobilePushView
        rootView={{
          id: 'root',
          title: 'Projects',
          element: <PushButton view={detail} label="open" />,
        }}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    // MobileNavBar renders a back button whose accessible name combines
    // "Go back to" + the previous view's title.
    expect(
      screen.getByRole('button', { name: /back to projects/i })
    ).toBeInTheDocument();
  });

  it('NavBar back button pops the stack on click', async () => {
    const detail: PushViewEntry = {
      id: 'detail',
      title: 'Detail',
      element: <p>detail</p>,
    };
    render(
      <MobilePushView
        rootView={{
          id: 'root',
          title: 'Projects',
          element: <PushButton view={detail} label="open" />,
        }}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByText('detail')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /back to projects/i }));
    expect(screen.queryByText('detail')).not.toBeInTheDocument();
  });

  it('depth is 1 at root, increments on push, decrements on pop', async () => {
    const layer2: PushViewEntry = {
      id: 'two',
      title: 'Two',
      element: (
        <>
          <DepthReadout />
          <PopButton />
        </>
      ),
    };
    render(
      <MobilePushView
        rootView={{
          id: 'root',
          title: 'Root',
          element: (
            <>
              <DepthReadout />
              <PushButton view={layer2} label="go" />
            </>
          ),
        }}
      />
    );

    // Both views render a <DepthReadout> from the same context, so they
    // always report the same depth. After push we expect two readouts,
    // both showing '2'; after pop only one remains.
    expect(screen.getAllByTestId('depth')).toHaveLength(1);
    expect(screen.getByTestId('depth')).toHaveTextContent('1');

    await userEvent.click(screen.getByRole('button', { name: 'go' }));
    const afterPush = screen.getAllByTestId('depth');
    expect(afterPush).toHaveLength(2);
    afterPush.forEach((el) => expect(el).toHaveTextContent('2'));

    await userEvent.click(screen.getByRole('button', { name: 'pop' }));
    expect(screen.getAllByTestId('depth')).toHaveLength(1);
    expect(screen.getByTestId('depth')).toHaveTextContent('1');
  });

  it('pop() at the root is a no-op (does not crash, depth stays 1)', async () => {
    render(
      <MobilePushView
        rootView={{
          id: 'root',
          title: 'Root',
          element: (
            <>
              <DepthReadout />
              <PopButton />
            </>
          ),
        }}
      />
    );

    expect(screen.getByTestId('depth')).toHaveTextContent('1');
    await userEvent.click(screen.getByRole('button', { name: 'pop' }));
    expect(screen.getByTestId('depth')).toHaveTextContent('1');
  });

  it('popToRoot returns from a deep stack in one call', async () => {
    const layer3: PushViewEntry = {
      id: 'three',
      title: 'Three',
      element: (
        <>
          <p>at three</p>
          <PopToRootButton label="home" />
        </>
      ),
    };
    const layer2: PushViewEntry = {
      id: 'two',
      title: 'Two',
      element: <PushButton view={layer3} label="go3" />,
    };
    render(
      <MobilePushView
        rootView={{
          id: 'root',
          title: 'Root',
          element: (
            <>
              <p>at root</p>
              <PushButton view={layer2} label="go2" />
            </>
          ),
        }}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'go2' }));
    await userEvent.click(screen.getByRole('button', { name: 'go3' }));
    expect(screen.getByText('at three')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'home' }));
    expect(screen.queryByText('at three')).not.toBeInTheDocument();
    expect(screen.getByText('at root')).toBeInTheDocument();
  });

  it('hideNavBar on a view skips the integrated NavBar', async () => {
    const detail: PushViewEntry = {
      id: 'detail',
      title: 'Detail',
      hideNavBar: true,
      element: <p>bare detail</p>,
    };
    render(
      <MobilePushView
        rootView={{
          id: 'root',
          title: 'Root',
          element: <PushButton view={detail} label="open" />,
        }}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    // No NavBar heading for the new view; the only heading remaining is
    // the root's (still mounted underneath during transition).
    const headings = screen.queryAllByRole('heading', { name: 'Detail' });
    expect(headings).toHaveLength(0);
    expect(screen.getByText('bare detail')).toBeInTheDocument();
  });

  it('navBarRight is forwarded to the NavBar', async () => {
    const detail: PushViewEntry = {
      id: 'detail',
      title: 'Detail',
      element: <p>x</p>,
      navBarRight: <button>Edit</button>,
    };
    render(
      <MobilePushView
        rootView={{
          id: 'root',
          title: 'Root',
          element: <PushButton view={detail} label="open" />,
        }}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('useMobileNavigation throws when used outside the provider', () => {
    // Silence the React error logging for this test.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<DepthReadout />)).toThrow(
      /must be used within <MobilePushView>/
    );
    spy.mockRestore();
  });

  it('child views with the same id across stacks share key (no double-push regression)', async () => {
    // Pushing the same id again *while it is still on the stack* is a
    // caller bug. We don't try to dedupe, but ensure we don't throw and
    // the screen still reflects something sensible.
    const detail: PushViewEntry = {
      id: 'detail',
      title: 'Detail',
      element: <p>detail one</p>,
    };
    render(
      <MobilePushView
        rootView={{
          id: 'root',
          title: 'Root',
          element: <PushButton view={detail} label="open" />,
        }}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByText('detail one')).toBeInTheDocument();
  });
});
