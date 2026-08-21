import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FormStatusMessage } from './FormStatusMessage.tsx';

describe('FormStatusMessage', () => {
  it('renders nothing for idle and submitting states', () => {
    const { container: idleContainer } = render(<FormStatusMessage status={{ kind: 'idle' }} />);
    expect(idleContainer).toBeEmptyDOMElement();

    const { container: submittingContainer } = render(
      <FormStatusMessage status={{ kind: 'submitting' }} />,
    );
    expect(submittingContainer).toBeEmptyDOMElement();
  });

  it('renders a status role message when done', () => {
    render(<FormStatusMessage status={{ kind: 'done', message: 'Account created' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Account created');
  });

  it('renders an alert role message on error', () => {
    render(<FormStatusMessage status={{ kind: 'error', message: 'Something failed' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something failed');
  });
});
