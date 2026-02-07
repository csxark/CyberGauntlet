import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlitchText } from '../GlitchText';

describe('GlitchText', () => {
  it('should render text content', () => {
    render(<GlitchText text="CYBER" />);
    
    expect(screen.getByText('CYBER')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<GlitchText text="CYBER" className="custom-class" />);
    
    const element = container.querySelector('.custom-class');
    expect(element).toBeInTheDocument();
  });

  it('should render with default props', () => {
    const { container } = render(<GlitchText text="Test" />);
    
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should handle empty text', () => {
    const { container } = render(<GlitchText text="" />);
    
    // Component should still render but with no text content
    const span = container.querySelector('span');
    expect(span).toBeTruthy();
  });

  it('should handle special characters', () => {
    render(<GlitchText text="Test!@#$%^&*()" />);
    
    expect(screen.getByText('Test!@#$%^&*()')).toBeInTheDocument();
  });
});
