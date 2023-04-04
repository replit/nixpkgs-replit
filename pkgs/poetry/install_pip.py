# The following scheme for bootstrapping pip is stolen from ensurepip:
# https://docs.python.org/3/library/ensurepip.html
# https://github.com/python/cpython/blob/3.11/Lib/ensurepip/__init__.py

import subprocess
import sys
import os

def run_pip(args, additional_paths=None):
    # Run the bootstraping in a subprocess to avoid leaking any state that happens
    # after pip has executed. Particulary, this avoids the case when pip holds onto
    # the files in *additional_paths*, preventing us to remove them at the end of the
    # invocation.
    code = f"""
import runpy
import sys
sys.path = {additional_paths or []} + sys.path
sys.argv[1:] = {args}
runpy.run_module("pip", run_name="__main__", alter_sys=True)
"""
    return subprocess.run([sys.executable, '-W', 'ignore::DeprecationWarning',
                           "-c", code], check=True).returncode

def main():
    if len(sys.argv) < 2:
        print('Please provide a links dir argument')
        exit(1)
    
    links_dir = sys.argv[1]
    additional_paths = []
    entries = os.listdir(links_dir)
    for entry in entries:
        if entry.startswith('pip-') or entry.startswith('setuptools-'):
            additional_paths.append(links_dir + '/' + entry)
    args = ["install", "--no-cache-dir", "--no-index", "--find-links", links_dir, '-v', 'pip', 'setuptools']
    run_pip(args, additional_paths)

if __name__ == "__main__":
    main()