import React from "react";
import { motion } from "framer-motion";
import { Mail, Linkedin, Github, ExternalLink } from "lucide-react";
import { contactLinks } from "@/data/aboutMe";

export function ContactSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-6 w-full max-w-4xl mx-auto">
      <div className="glass-subtle rounded-2xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-text mb-4">Let&apos;s Connect</h2>

        <div className="space-y-4">
          <p className="text-text-secondary mb-6">
            Always open to discussing opportunities, collaborations, or just chatting about tech.
          </p>

          <div className="flex flex-col gap-3">
            <a
              href={`mailto:${contactLinks.email}`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent text-white
                       hover:bg-accent/90 transition-all duration-200 hover:scale-[1.02]">
              <Mail size={18} />
              <span className="font-medium">{contactLinks.email}</span>
            </a>

            <a
              href={contactLinks.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 rounded-xl
                       glass-subtle border border-white/20 hover:border-accent/50
                       transition-all duration-200 hover:scale-[1.02] text-text">
              <div className="flex items-center gap-3">
                <Linkedin size={18} />
                <span className="font-medium">LinkedIn</span>
              </div>
              <ExternalLink size={16} className="text-text-secondary" />
            </a>

            <a
              href={contactLinks.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 rounded-xl
                       glass-subtle border border-white/20 hover:border-accent/50
                       transition-all duration-200 hover:scale-[1.02] text-text">
              <div className="flex items-center gap-3">
                <Github size={18} />
                <span className="font-medium">GitHub</span>
              </div>
              <ExternalLink size={16} className="text-text-secondary" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
