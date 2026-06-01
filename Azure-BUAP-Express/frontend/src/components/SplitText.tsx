import { motion } from 'framer-motion'

interface SplitTextProps {
  text: string
  className?: string
  delay?: number
  duration?: number
}

export function SplitText({
  text,
  className = '',
  delay = 0.04,
  duration = 0.6
}: SplitTextProps) {
  const words = text.split(' ')

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delay
      }
    }
  }

  const childVariants = {
    hidden: {
      opacity: 0,
      y: 24,
      filter: 'blur(6px)'
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: duration,
        ease: [0.16, 1, 0.3, 1] as any // Custom premium cubic-bezier easing
      }
    }
  }

  return (
    <motion.h2
      className={`inline-block whitespace-normal ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, i) => (
        <span key={i} className="inline-block whitespace-nowrap mr-[0.25em]">
          {word.split('').map((char, j) => (
            <motion.span
              key={j}
              className="inline-block origin-bottom"
              variants={childVariants}
            >
              {char}
            </motion.span>
          ))}
        </span>
      ))}
    </motion.h2>
  )
}
